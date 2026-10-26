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
  url = 'https://chatgpt.com/',
  injectionError = false,
  savedState,
  sendError = false,
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
      get: async () => ({ url }),
      sendMessage: async (tabId, msg) => {
        if (!connected)
          throw Error(
            'Could not establish connection. Receiving end does not exist.',
          );
        if (msg.type === 'SEND') {
          sent.push({ tabId, ...msg });
          if (sendError) return { ok: false, error: 'Send failed' };
        }
        return { ok: true, build: version, composer: true };
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
  assert.match(page.sent[1].text, /Relay stopping rule:.*#stop#/);
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
    assert.equal(
      result.stopReason,
      'Discussion finished or awaiting your input',
    );
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
