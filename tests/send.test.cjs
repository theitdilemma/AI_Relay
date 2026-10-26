const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup({
  delay = 0,
  fallback = false,
  unavailable = false,
  ignoredClick = false,
  replaceAt = Infinity,
  format = (value) => value,
} = {}) {
  let now = 0,
    listener,
    clicks = 0;
  const element = (extra = {}) => ({
    isConnected: true,
    disabled: false,
    getClientRects: () => [{}],
    matches: () => false,
    getAttribute: () => null,
    ...extra,
  });
  const form = {
    contains: (el) => el.form === form,
    querySelectorAll: () => (fallback ? [send] : []),
  };
  const send = element({
    form,
    click: () => {
      clicks++;
      if (!ignoredClick) composer.value = '';
    },
  });
  Object.defineProperty(send, 'disabled', {
    get: () => unavailable || now < delay,
  });
  const hidden = element({ getClientRects: () => [] });
  const disabled = element({ disabled: true });
  const composer = element({
    value: '',
    isContentEditable: false,
    focus() {},
    dispatchEvent() {},
    closest: () => form,
  });
  const newForm = {
    contains: (el) => el.form === newForm,
    querySelectorAll: () => [],
  };
  const replacement = Object.create(composer);
  replacement.closest = () => newForm;
  const document = {
    documentElement: {},
    querySelector: () => null,
    querySelectorAll: (selector) => {
      if (now >= replaceAt) send.form = newForm;
      return selector === '.composer'
        ? [hidden, now >= replaceAt ? replacement : composer]
        : selector === '.send' && !fallback
          ? [hidden, disabled, send]
          : [];
    },
  };
  const context = {
    window: {
      AIRelayAdapter: {
        name: 'Test',
        composer: ['.composer'],
        send: ['.send'],
        busy: [],
        messages: [],
      },
    },
    document,
    getComputedStyle: () => ({ visibility: 'visible', display: 'block' }),
    Date: { now: () => now },
    setInterval() {},
    setTimeout(fn, ms) {
      now += ms;
      fn();
    },
    MutationObserver: class {
      observe() {}
    },
    Event: class {},
    HTMLTextAreaElement: {
      prototype: {
        set value(value) {
          composer.value = format(value);
        },
      },
    },
    chrome: {
      runtime: {
        sendMessage: () => Promise.resolve(),
        onMessage: {
          addListener(fn) {
            listener = fn;
          },
        },
      },
    },
  };
  vm.runInNewContext(
    fs.readFileSync(require.resolve('../content.js'), 'utf8'),
    context,
  );
  return {
    send: (text = 'Hello') =>
      new Promise((resolve) => listener({ type: 'SEND', text }, {}, resolve)),
    composer,
    clicks: () => clicks,
    now: () => now,
  };
}

test('skips hidden/disabled matches and waits for editor readiness', async () => {
  const page = setup({ delay: 900 });
  assert.equal((await page.send()).ok, true);
  assert.equal(page.clicks(), 1);
  assert.ok(page.now() >= 900);
  assert.equal(page.composer.value, '');
});
test('uses an enabled submit button in the composer form when labels differ', async () => {
  const page = setup({ fallback: true });
  assert.equal((await page.send()).ok, true);
  assert.equal(page.clicks(), 1);
});
test('preserves draft and reports the platform when Send stays disabled', async () => {
  const page = setup({ unavailable: true });
  const result = await page.send();
  assert.equal(result.ok, false);
  assert.match(result.error, /Test:.*20 seconds/);
  assert.equal(page.clicks(), 0);
  assert.equal(page.composer.value, 'Hello');
  assert.equal(page.now(), 20000);
});
test('waits through a readiness delay longer than the old five-second timeout', async () => {
  const page = setup({ delay: 6500 });
  assert.equal((await page.send()).ok, true);
  assert.equal(page.clicks(), 1);
  assert.ok(page.now() >= 6500);
});
test('does not report an ignored click as a successful send', async () => {
  const page = setup({ ignoredClick: true });
  const result = await page.send();
  assert.equal(result.ok, false);
  assert.match(result.error, /draft was not cleared/);
  assert.equal(page.clicks(), 1);
  assert.equal(page.composer.value, 'Hello');
});
test('can retry the identical unsent draft without inserting it twice', async () => {
  const page = setup();
  page.composer.value = 'Hello';
  assert.equal((await page.send()).ok, true);
  assert.equal(page.clicks(), 1);
  assert.equal(page.composer.value, '');
});
test('preserves a different draft instead of overwriting it', async () => {
  const page = setup();
  page.composer.value = 'My draft';
  assert.equal((await page.send()).ok, false);
  assert.equal(page.clicks(), 0);
  assert.equal(page.composer.value, 'My draft');
});
test('finds the new form after the editor is replaced while Send is disabled', async () => {
  const page = setup({ delay: 1200, replaceAt: 500 });
  assert.equal((await page.send()).ok, true);
  assert.equal(page.clicks(), 1);
});
test('submits long multiline text when the editor normalizes paragraph spacing', async () => {
  const page = setup({
    format: (value) => value.replace(/\r\n/g, '\n\n').replace(/ /g, '\u00a0'),
  });
  const message =
    '## Business idea\r\n\r\n' +
    'A detailed prompt with several paragraphs.\r\n'.repeat(100);
  const result = await page.send(message);
  assert.equal(result.ok, true, result.error);
  assert.equal(page.clicks(), 1);
});
test('retries a normalized multiline draft left by an earlier attempt', async () => {
  const page = setup();
  page.composer.value = 'First paragraph.\n\nSecond\u00a0paragraph.';
  const result = await page.send('First paragraph.\r\nSecond paragraph.');
  assert.equal(result.ok, true, result.error);
  assert.equal(page.clicks(), 1);
});
