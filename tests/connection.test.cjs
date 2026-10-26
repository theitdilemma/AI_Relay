const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const version = JSON.parse(
  fs
    .readFileSync(require.resolve('../manifest.json'), 'utf8')
    .replace(/^\uFEFF/, ''),
).version;

function setup({
  missing = false,
  url = 'https://chatgpt.com/c/test-chat',
  injectionError = false,
  savedState,
  sendError = false,
  introPresent = false,
} = {}) {
  let connected = !missing,
    injections = [],
    messageHandler;
  const sent = [];
  const event = { addListener() {} };
  const chrome = {
    storage: {
      local: {
        set() {},
        get: () => Promise.resolve({ relayState: savedState }),
      },
    },
    runtime: {
      sendMessage: () => Promise.resolve(),
      getManifest: () => ({ version }),
      onInstalled: event,
      onStartup: event,
      onMessage: {
        addListener(fn) {
          messageHandler = fn;
        },
      },
    },
    action: { onClicked: event },
    tabs: {
      onRemoved: event,
      get: async (tabId) => ({
        url: tabId === 456 ? 'https://claude.ai/chat/test-chat' : url,
      }),
      sendMessage: async (tabId, msg) => {
        if (!connected)
          throw Error(
            'Could not establish connection. Receiving end does not exist.',
          );
        if (msg.type === 'SEND') {
          sent.push({ tabId, ...msg });
          if (sendError) return { ok: false, error: 'Send failed' };
        }
        return {
          ok: true,
          build: version,
          composer: true,
          introPresent,
          conversationKey:
            tabId === 456 ? 'https://claude.ai/chat/test-chat' : url,
        };
      },
    },
    scripting: {
      executeScript: async (options) => {
        if (injectionError) throw Error('Cannot access contents of the page');
        injections.push(options);
        connected = true;
      },
    },
  };
  const context = vm.createContext({ chrome, URL });
  vm.runInContext(
    fs.readFileSync(require.resolve('../background.js'), 'utf8'),
    context,
  );
  return {
    check: () => vm.runInContext('checkTab(123)', context),
    injections,
    sent,
    setUrl(value) {
      url = value;
    },
    setSendError(value) {
      sendError = value;
    },
    request: (msg, sender = {}) =>
      new Promise((resolve) => messageHandler(msg, sender, resolve)),
    evaluate: (source) => vm.runInContext(source, context),
  };
}
test('reconnects an already-open ChatGPT page after reinstall', async () => {
  const page = setup({ missing: true });
  await page.check();
  assert.equal(page.injections.length, 1);
  assert.deepEqual(Array.from(page.injections[0].files), [
    'adapters/chatgpt.js',
    'content.js',
  ]);
});
test('loads the Claude adapter for Claude tabs', async () => {
  const page = setup({ missing: true, url: 'https://claude.ai/new' });
  await page.check();
  assert.deepEqual(Array.from(page.injections[0].files), [
    'adapters/claude.js',
    'content.js',
  ]);
});
test('does not inject again when a page is already connected', async () => {
  const page = setup();
  await page.check();
  assert.equal(page.injections.length, 0);
});
test('does not inject into an unsupported website', async () => {
  const page = setup({ missing: true, url: 'https://example.com/' });
  await assert.rejects(page.check(), /Select a ChatGPT or Claude website tab/);
  assert.equal(page.injections.length, 0);
});
test('provides recovery instructions if Chrome rejects injection', async () => {
  const page = setup({ missing: true, injectionError: true });
  await assert.rejects(page.check(), /Refresh that website tab/);
});
test('unlimited setting survives configuration and allows forwarding past 30', async () => {
  const page = setup();
  const result = await page.request({
    type: 'CONFIG',
    chatgptTab: 123,
    claudeTab: 456,
    automatic: true,
    maxRounds: null,
  });
  assert.equal(result.maxRounds, null);
  page.evaluate(
    'state.rounds=100;state.running=true;state.pending={from:"ChatGPT",text:"Reply"}',
  );
  const forwarded = await page.request({ type: 'FORWARD' });
  assert.equal(forwarded.rounds, 101);
  assert.equal(forwarded.running, true);
  const stopped = await page.request({ type: 'STOP' });
  assert.equal(stopped.running, false);
});
test('finite limit still stops after the configured number of forwards', async () => {
  const page = setup();
  await page.request({
    type: 'CONFIG',
    chatgptTab: 123,
    claudeTab: 456,
    automatic: true,
    maxRounds: 8,
  });
  page.evaluate(
    'state.rounds=7;state.running=true;state.pending={from:"ChatGPT",text:"Reply"}',
  );
  const result = await page.request({ type: 'FORWARD' });
  assert.equal(result.rounds, 8);
  assert.equal(result.running, false);
});
test('worker wake restores running state before processing a delayed reply', async () => {
  const page = setup({
    savedState: {
      chatgptTab: 123,
      claudeTab: 456,
      running: true,
      automatic: true,
      maxRounds: null,
      history: [],
      originalPrompt: 'Original question',
    },
  });
  const result = await page.request(
    { type: 'RESPONSE', platform: 'ChatGPT', text: 'Delayed answer' },
    { tab: { id: 123 } },
  );
  assert.equal(result.running, true);
  assert.equal(result.rounds, 1);
  assert.equal(page.sent[0].tabId, 456);
  assert.match(page.sent[0].text, /Original question/);
  assert.match(page.sent[0].text, /Delayed answer/);
  assert.equal(result.claudeHasContext, true);
});
test('first manual forward includes original prompt; later forwards include only replies', async () => {
  const page = setup({
    savedState: {
      chatgptTab: 123,
      claudeTab: 456,
      running: true,
      automatic: false,
      originalPrompt: 'Original question',
      pending: { from: 'ChatGPT', text: 'First reply' },
    },
  });
  await page.request({ type: 'FORWARD' });
  assert.match(page.sent[0].text, /Original question/);
  page.evaluate('state.pending={from:"ChatGPT",text:"Second reply"}');
  await page.request({ type: 'FORWARD' });
  assert.ok(
    page.sent[1].text.startsWith('Message from ChatGPT:\n\nSecond reply'),
  );
  assert.ok(!page.sent[1].text.includes('Original question'));
  assert.ok(!page.sent[1].text.includes('Conversation introduction'));
});
test('failed first forward retains original context for retry', async () => {
  const page = setup({
    sendError: true,
    savedState: {
      chatgptTab: 123,
      claudeTab: 456,
      running: true,
      automatic: false,
      originalPrompt: 'Original question',
      pending: { from: 'ChatGPT', text: 'First reply' },
    },
  });
  await page.request({ type: 'FORWARD' });
  assert.equal(page.evaluate('state.claudeHasContext'), false);
  assert.equal(page.evaluate('state.pending.text'), 'First reply');
});
for (const platform of ['ChatGPT', 'Claude']) {
  test(`${platform} exact stop marker ends the relay without forwarding it`, async () => {
    const page = setup({
      savedState: {
        chatgptTab: 123,
        claudeTab: 456,
        running: true,
        automatic: true,
        maxRounds: null,
        history: [],
      },
    });
    const result = await page.request(
      { type: 'RESPONSE', platform, text: ' \n#STOP#\n ' },
      { tab: { id: platform === 'ChatGPT' ? 123 : 456 } },
    );
    assert.equal(result.running, false);
    assert.equal(result.pending, null);
    assert.equal(result.stopReason, 'Discussion complete');
    assert.equal(page.sent.length, 0);
    assert.equal(result.history[0].kind, 'control');
  });
}
test('a stop marker quoted inside a response does not stop the relay', async () => {
  const page = setup({
    savedState: {
      chatgptTab: 123,
      claudeTab: 456,
      running: true,
      automatic: false,
      history: [],
    },
  });
  const result = await page.request(
    {
      type: 'RESPONSE',
      platform: 'ChatGPT',
      text: 'We can use #stop# when finished.',
    },
    { tab: { id: 123 } },
  );
  assert.equal(result.running, true);
  assert.equal(result.pending.text, 'We can use #stop# when finished.');
});
for (const platform of ['ChatGPT', 'Claude']) {
  test(`${platform} userInput pauses with the question and does not forward the flag`, async () => {
    const page = setup({
      savedState: {
        chatgptTab: 123,
        claudeTab: 456,
        running: true,
        automatic: true,
        rounds: 3,
        maxRounds: null,
      },
    });
    const result = await page.request(
      {
        type: 'RESPONSE',
        platform,
        text: 'What budget should we use?\n\n#userInput#',
      },
      { tab: { id: platform === 'ChatGPT' ? 123 : 456 } },
    );
    assert.equal(result.running, false);
    assert.equal(result.pending, null);
    assert.equal(result.awaitingInput.question, 'What budget should we use?');
    assert.equal(result.awaitingInput.from, platform);
    assert.equal(result.rounds, 3);
    assert.equal(page.sent.length, 0);
    assert.equal(result.history.at(-1).text, 'What budget should we use?');
  });
}
test('a quoted userInput marker does not pause ordinary discussion', async () => {
  const page = setup({
    savedState: {
      chatgptTab: 123,
      claudeTab: 456,
      running: true,
      automatic: false,
    },
  });
  const result = await page.request(
    {
      type: 'RESPONSE',
      platform: 'ChatGPT',
      text: 'Use #userInput# when you need a decision.',
    },
    { tab: { id: 123 } },
  );
  assert.equal(result.running, true);
  assert.equal(result.awaitingInput, null);
});
const waitingState = {
  chatgptTab: 123,
  claudeTab: 456,
  running: false,
  automatic: true,
  rounds: 4,
  maxRounds: null,
  awaitingInput: {
    from: 'ChatGPT',
    tabId: 123,
    question: 'Budget?',
    conversationKey: 'https://chatgpt.com/c/test-chat',
  },
  introductions: { 'https://chatgpt.com/c/test-chat': true },
};
test('user reply returns to the asking model and resumes without resetting the round count', async () => {
  const page = setup({ savedState: waitingState });
  const result = await page.request({ type: 'USER_REPLY', text: 'Use $500.' });
  assert.equal(result.running, true);
  assert.equal(result.awaitingInput, null);
  assert.equal(result.rounds, 4);
  assert.equal(page.sent.length, 1);
  assert.equal(page.sent[0].tabId, 123);
  assert.match(page.sent[0].text, /Use \$500/);
  assert.ok(!page.sent[0].text.includes('Conversation introduction'));
});
test('failed user reply preserves the question and stays paused for retry', async () => {
  const page = setup({ savedState: waitingState, sendError: true });
  const result = await page.request({ type: 'USER_REPLY', text: 'Use $500.' });
  assert.match(result.error, /Send failed/);
  assert.equal(page.evaluate('state.running'), false);
  assert.equal(page.evaluate('state.awaitingInput.question'), 'Budget?');
});
test('reply is refused if the asking tab has switched to a different conversation', async () => {
  const page = setup({
    savedState: waitingState,
    url: 'https://chatgpt.com/c/another-chat',
  });
  const result = await page.request({ type: 'USER_REPLY', text: 'Use $500.' });
  assert.match(result.error, /changed conversations/);
  assert.equal(page.sent.length, 0);
});
test('worker wake preserves a waiting user-input request', async () => {
  const page = setup({ savedState: waitingState });
  const result = await page.request({ type: 'GET' });
  assert.equal(result.awaitingInput.question, 'Budget?');
  assert.equal(result.running, false);
});
test('introduction is sent once per chat, including after a later Start in the same chat', async () => {
  const page = setup({ savedState: { chatgptTab: 123, claudeTab: 456 } });
  await page.request({ type: 'START', text: 'Explore idea one.' });
  await page.request({ type: 'STOP' });
  await page.request({ type: 'START', text: 'Now explore idea two.' });
  assert.match(page.sent[0].text, /AI Relay · Conversation introduction/);
  assert.match(page.sent[0].text, /#userInput#/);
  assert.equal(page.sent[1].text, 'Now explore idea two.');
});
test('a new chat gets its own introduction', async () => {
  const page = setup({
    savedState: {
      chatgptTab: 123,
      claudeTab: 456,
      introductions: { 'https://chatgpt.com/c/test-chat': true },
    },
  });
  page.setUrl('https://chatgpt.com/c/new-chat');
  await page.request({ type: 'START', text: 'New idea.' });
  assert.match(page.sent[0].text, /Conversation introduction/);
});
test('an introduction detected in the chat prevents duplicate setup after lost local state', async () => {
  const page = setup({
    introPresent: true,
    savedState: { chatgptTab: 123, claudeTab: 456 },
  });
  await page.request({ type: 'START', text: 'Follow up.' });
  assert.equal(page.sent[0].text, 'Follow up.');
});
test('failed introduction is not marked sent and is included on retry', async () => {
  const page = setup({
    sendError: true,
    savedState: { chatgptTab: 123, claudeTab: 456 },
  });
  await page.request({ type: 'START', text: 'Idea.' });
  assert.equal(
    page.evaluate('state.introductions["https://chatgpt.com/c/test-chat"]'),
    undefined,
  );
  page.setSendError(false);
  await page.request({ type: 'START', text: 'Idea.' });
  assert.match(page.sent[1].text, /Conversation introduction/);
});
