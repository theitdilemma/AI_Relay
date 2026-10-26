const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup({ tabError, windowError } = {}) {
  const handlers = {},
    tabs = [],
    windows = [],
    saved = [];
  const event = (name) => ({
    addListener(fn) {
      handlers[name] = fn;
    },
  });
  const chrome = {
    runtime: {
      getURL: (path) => `chrome-extension://test/${path}`,
      onInstalled: event('installed'),
      onStartup: event('startup'),
      onMessage: event('message'),
      sendMessage: async () => {},
    },
    action: { onClicked: event('clicked') },
    storage: {
      local: {
        get: async () => ({}),
        set: async (value) => saved.push(structuredClone(value)),
      },
    },
    tabs: {
      onRemoved: event('removed'),
      create: async (options) => {
        tabs.push(options);
        if (tabError) throw Error(tabError);
      },
      sendMessage: async () => {},
    },
    windows: {
      create: async (options) => {
        windows.push(options);
        if (windowError) throw Error(windowError);
      },
    },
  };
  const context = vm.createContext({ chrome, URL, console });
  vm.runInContext(
    fs.readFileSync(require.resolve('../background.js'), 'utf8'),
    context,
  );
  return { handlers, tabs, windows, saved };
}
test('installation opens a normal browser window if no current window exists', async () => {
  const page = setup({ tabError: 'No current window' });
  await page.handlers.installed();
  assert.equal(page.tabs.length, 1);
  assert.equal(page.windows.length, 1);
  assert.equal(page.windows[0].url, 'chrome-extension://test/dashboard.html');
  assert.equal(page.windows[0].type, 'normal');
  assert.equal(page.saved.at(-1).relayState.error, null);
});
test('toolbar click opens the dashboard in the clicked tab window', async () => {
  const page = setup();
  await page.handlers.clicked({ windowId: 44 });
  assert.equal(page.tabs[0].windowId, 44);
  assert.equal(page.windows.length, 0);
});
test('toolbar click recovers if its browser window closed before opening', async () => {
  const page = setup({ tabError: 'No window with id: 44.' });
  await page.handlers.clicked({ windowId: 44 });
  assert.equal(page.windows.length, 1);
});
test('dashboard-open failure is saved instead of escaping as an unhandled rejection', async () => {
  const page = setup({
    tabError: 'No current window',
    windowError: 'Window creation failed',
  });
  await assert.doesNotReject(page.handlers.installed());
  assert.match(page.saved.at(-1).relayState.error, /Window creation failed/);
});
test('unrelated tab errors are reported without opening an extra window', async () => {
  const page = setup({ tabError: 'Unexpected tab error' });
  await assert.doesNotReject(page.handlers.clicked({ windowId: 44 }));
  assert.equal(page.windows.length, 0);
  assert.match(page.saved.at(-1).relayState.error, /Unexpected tab error/);
});
