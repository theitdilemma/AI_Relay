const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup() {
  let now = 0,
    listener,
    tick;
  const nodes = new Map(),
    notifications = [];
  const context = {
    window: {},
    document: {
      documentElement: {},
      querySelector: () => null,
      querySelectorAll: (selector) => nodes.get(selector) || [],
    },
    getComputedStyle: () => ({ visibility: 'visible', display: 'block' }),
    Date: { now: () => now },
    setInterval(fn) {
      tick = fn;
    },
    MutationObserver: class {
      observe() {}
    },
    chrome: {
      runtime: {
        sendMessage: (msg) => {
          notifications.push(msg);
          return Promise.resolve();
        },
        onMessage: {
          addListener(fn) {
            listener = fn;
          },
        },
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(require.resolve('../adapters/chatgpt.js'), 'utf8'),
    context,
  );
  vm.runInContext(
    fs.readFileSync(require.resolve('../content.js'), 'utf8'),
    context,
  );
  return {
    nodes,
    notifications,
    arm: () => listener({ type: 'ARM' }, {}, () => {}),
    tick(ms = 0) {
      now += ms;
      tick();
    },
  };
}
test('captures a reply in the current ChatGPT assistant container after text stabilizes', () => {
  const page = setup();
  page.arm();
  const reply = { innerText: 'Test successful!' };
  page.nodes.set('[data-markdown-text-style="assistant-message"]', [reply]);
  page.tick();
  page.tick(1000);
  reply.innerText = 'Test successful!\nMessage received loud and clear.';
  page.tick();
  page.tick(2399);
  assert.equal(
    page.notifications.filter((m) => m.type === 'RESPONSE').length,
    0,
  );
  page.tick(1);
  page.tick(3000);
  const responses = page.notifications.filter((m) => m.type === 'RESPONSE');
  assert.equal(responses.length, 1);
  assert.equal(responses[0].text, reply.innerText);
});
test('waits for visible generation controls but ignores hidden stale controls', () => {
  const page = setup();
  page.arm();
  page.nodes.set('[data-markdown-text-style="assistant-message"]', [
    { innerText: 'Reply' },
  ]);
  let shown = true;
  page.nodes.set('button[data-testid="stop-button"]', [
    { isConnected: true, getClientRects: () => (shown ? [{}] : []) },
  ]);
  page.tick();
  page.tick(3000);
  assert.equal(
    page.notifications.filter((m) => m.type === 'RESPONSE').length,
    0,
  );
  shown = false;
  page.tick();
  assert.equal(
    page.notifications.filter((m) => m.type === 'RESPONSE').length,
    1,
  );
});
test('keeps legacy ChatGPT reply capture working', () => {
  const page = setup();
  page.arm();
  page.nodes.set('[data-message-author-role="assistant"]', [
    { innerText: 'Legacy reply' },
  ]);
  page.tick();
  page.tick(2500);
  assert.equal(
    page.notifications.find((m) => m.type === 'RESPONSE').text,
    'Legacy reply',
  );
});
