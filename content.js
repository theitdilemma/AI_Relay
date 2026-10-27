(() => {
  const build = '0.4.5';
  const a = window.AIRelayAdapter;
  if (!a || window.__aiRelayInstalled) return;
  window.__aiRelayInstalled = true;
  const find = (selectors) =>
    selectors.map((s) => document.querySelector(s)).find(Boolean);
  const all = (selectors) =>
    [
      ...new Set(selectors.flatMap((s) => [...document.querySelectorAll(s)])),
    ].sort((left, right) =>
      left.compareDocumentPosition?.(right) & 2
        ? 1
        : left.compareDocumentPosition?.(right) & 4
          ? -1
          : 0,
    );
  const visible = (el) =>
    !!el &&
    el.isConnected &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== 'hidden' &&
    getComputedStyle(el).display !== 'none';
  const enabled = (el) =>
    visible(el) &&
    !el.disabled &&
    !el.matches(':disabled') &&
    el.getAttribute('aria-disabled') !== 'true';
  const getComposer = () => all(a.composer).find(enabled);
  function getSend(composer) {
    const form = composer.closest('form');
    const candidates = all(a.send).filter(enabled);
    if (form) {
      // A form-associated button may sit outside the form itself.
      return (
        candidates.find(
          (button) => button.form === form || form.contains(button),
        ) || [...form.querySelectorAll('button[type="submit"]')].find(enabled)
      );
    }
    // Some editors have no form. Prefer their nearest send control.
    for (
      let parent = composer.parentElement;
      parent && parent !== document.body;
      parent = parent.parentElement
    ) {
      const button = candidates.find((candidate) => parent.contains(candidate));
      if (button) return button;
    }
    return null;
  }
  const textOf = (el) => (el?.innerText || el?.textContent || '').trim();
  function responseText(el) {
    const raw = textOf(el);
    if (!/#(?:stop|userinput)#/i.test(raw) || !el?.cloneNode) return raw;
    // Some message wrappers include copy/rating controls, timestamps and
    // screen-reader labels. Those must not conceal a standalone stop marker.
    // Only normalize the marker; preserve the original formatting of replies.
    const copy = el.cloneNode(true);
    for (const control of copy.querySelectorAll(
      'button, [role="toolbar"], [role="status"], time, svg, .sr-only, [aria-hidden="true"]',
    ))
      control.remove();
    const clean = (copy.textContent || '').trim();
    if (clean.toLowerCase() === '#stop#') return '#stop#';
    if (clean.toLowerCase() === '#userinput#') return '#userInput#';
    // Preserve paragraph boundaries for questions whose last line is a flag.
    const paragraphs = [...copy.querySelectorAll('p, pre, li')]
      .map(textOf)
      .filter(Boolean);
    if (paragraphs.length && paragraphs.at(-1).toLowerCase() === '#userinput#')
      return paragraphs.join('\n\n');
    return raw;
  }
  let last = '',
    changedAt = 0,
    reported = '',
    pending = false,
    sending = false,
    sendEpoch = 0;
  const composerText = (el) =>
    (el?.isContentEditable ? textOf(el) : el?.value || '').trim();
  // Rich-text editors normalize CRLF, nonbreaking spaces and paragraph breaks.
  // Compare rendered content without rewriting or duplicating the draft.
  const comparable = (text) =>
    text
      .replace(/[\u200B\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const sameDraft = (left, right) => comparable(left) === comparable(right);
  const notify = (type, data = {}) =>
    chrome.runtime
      .sendMessage({ type, platform: a.name, ...data })
      .catch(() => {});
  function scan() {
    const nodes = all(a.messages).filter((el) => textOf(el));
    const latest = nodes[nodes.length - 1];
    const value = responseText(latest);
    if (value !== last) {
      last = value;
      changedAt = Date.now();
    }
    if (!value || value === reported || !pending) return;
    if (all(a.busy).some(visible)) return;
    // Stability guard: do not forward partial streaming text.
    if (Date.now() - changedAt < 2400) return;
    reported = value;
    pending = false;
    notify('RESPONSE', { text: value });
  }
  const observer = new MutationObserver(() => {
    scan();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['aria-label', 'disabled'],
  });
  setInterval(scan, 850);
  function setComposer(el, value) {
    el.focus();
    if (el.isContentEditable) {
      // Native insertText produces input events in modern editors.
      document.execCommand('selectAll', false, null);
      if (!document.execCommand('insertText', false, value))
        throw Error('Editor rejected text insertion');
      el.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: value,
        }),
      );
    } else {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      )?.set;
      if (!setter) throw Error('Unsupported input');
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  async function submit(value) {
    if (sending) throw Error(`${a.name}: another send is already in progress.`);
    sending = true;
    const epoch = sendEpoch;
    try {
      let composer = getComposer();
      if (!composer)
        throw Error('Composer not found. Site layout may have changed.');
      if (all(a.busy).some(visible))
        throw Error('AI is still generating. Wait and retry.');
      const draft = composerText(composer);
      if (draft && !sameDraft(draft, value))
        throw Error(
          `${a.name}: the composer contains a different draft. Send or save that draft, then retry AI Relay.`,
        );
      scan();
      const baseline = last;
      if (!draft) setComposer(composer, value);
      // Controlled editors can render/enable Send well after the input event.
      const deadline = Date.now() + 20000;
      let send;
      while (Date.now() < deadline) {
        if (epoch !== sendEpoch)
          throw Error('Send cancelled because the relay was paused.');
        // A controlled editor may replace its composer/form after input.
        composer = getComposer();
        if (composer && !sameDraft(composerText(composer), value))
          throw Error(
            `${a.name}: composer changed before sending. Review the draft.`,
          );
        if (
          composer &&
          !all(a.busy).some(visible) &&
          (send = getSend(composer))
        )
          break;
        await new Promise((r) => setTimeout(r, 100));
      }
      if (send) {
        reported = baseline;
        pending = true;
        changedAt = Date.now();
        send.click();
        // A click alone is not delivery: the site must consume the draft.
        const acceptedBy = Date.now() + 10000;
        while (Date.now() < acceptedBy) {
          if (epoch !== sendEpoch)
            throw Error('Send cancelled because the relay was paused.');
          const current = getComposer();
          if (current && !composerText(current)) return;
          await new Promise((r) => setTimeout(r, 100));
        }
        pending = false;
        throw Error(
          `${a.name}: Send was clicked but the draft was not cleared. Response remains available in AI Relay; use Forward to other AI to retry after checking the website.`,
        );
      } else {
        // Do not guess keyboard shortcuts: prevent accidental unsent messages.
        throw Error(
          `${a.name}: no visible, enabled Send button became available within 20 seconds. Message remains in the composer. Use Forward to other AI to retry the same draft.`,
        );
      }
    } finally {
      sending = false;
    }
  }
  chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (msg.type === 'PING') {
      respond({
        ok: true,
        build,
        platform: a.name,
        composer: !!getComposer(),
        messages: all(a.messages).length,
        conversationKey: location.origin + location.pathname,
        introPresent: [
          ...document.querySelectorAll(
            'main article, [data-message-author-role], [data-chatgpt-selection-message-id], [data-testid="user-message"]',
          ),
        ].some((el) =>
          (el.textContent || '').includes(
            'AI Relay · Conversation introduction',
          ),
        ),
      });
      return;
    }
    if (msg.type === 'ARM') {
      reported = last;
      pending = true;
      changedAt = Date.now();
      respond({ ok: true });
      return;
    }
    if (msg.type === 'SEND') {
      submit(msg.text)
        .then(() => respond({ ok: true }))
        .catch((e) => respond({ ok: false, error: e.message }));
      return true;
    }
    if (msg.type === 'DISARM') {
      sendEpoch++;
      pending = false;
      respond({ ok: true });
      return;
    }
  });
  notify('PAGE_READY');
})();
