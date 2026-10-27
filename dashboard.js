const $ = (id) => document.getElementById(id);
document.querySelector('h1 small').textContent =
  `v${chrome.runtime.getManifest().version}`;
let state = null;
const ask = async (payload) => {
  const r = await chrome.runtime.sendMessage(payload);
  if (r?.error) throw Error(r.error);
  return r;
};
function error(e) {
  $('error').hidden = false;
  $('error').textContent = e.message || String(e);
}
function clearError() {
  $('error').hidden = true;
}
async function safely(fn) {
  try {
    clearError();
    await fn();
  } catch (e) {
    error(e);
  }
}
function scrollToLatest() {
  const history = $('history');
  history.scrollTop = history.scrollHeight;
}
window.addEventListener('resize', scrollToLatest);
function render(s) {
  if (!s) return;
  state = s;
  $('status').textContent = s.running
    ? '● Running'
    : s.awaitingInput
      ? '● Your input needed'
      : s.stopReason
        ? '■ Finished'
        : 'Ⅱ Paused';
  $('status').title = s.stopReason || '';
  $('completion').hidden = !s.stopReason;
  $('completion').textContent = s.stopReason || '';
  $('status').classList.toggle('live', !!s.running);
  $('status').classList.toggle('waiting', !!s.awaitingInput && !s.running);
  $('inputRequest').hidden = !s.awaitingInput;
  $('interjectionPanel').hidden = !!s.awaitingInput;
  $('inputQuestion').textContent =
    s.awaitingInput?.question ||
    'The discussion is paused. Share the information or direction the models need.';
  $('replyDestination').textContent = s.awaitingInput
    ? `Reply goes to ${s.awaitingInput.from}, then the relay resumes.`
    : '';
  $('sendReply').disabled = s.running;
  $('messageCount').textContent = s.history.filter(
    (m) => m.kind !== 'control',
  ).length;
  $('rounds').textContent =
    s.maxRounds === null
      ? `${s.rounds} forwards · Unlimited`
      : `${s.rounds}/${s.maxRounds} forwards`;
  $('pending').hidden = !s.pending;
  if (s.pending)
    $('pendingLabel').textContent =
      `${s.pending.from} → ${s.pending.from === 'ChatGPT' ? 'Claude' : 'ChatGPT'}`;
  $('forward').disabled = !s.pending;
  $('start').disabled = !!s.running || !!s.awaitingInput;
  $('stop').disabled = !s.running;
  $('stopTop').disabled = !s.running && !s.awaitingInput && !s.pending;
  const root = $('history');
  root.replaceChildren();
  if (!s.history.length) {
    const d = document.createElement('div');
    d.className = 'empty';
    const icon = document.createElement('img');
    icon.src = 'icons/logo.svg';
    icon.alt = '';
    const heading = document.createElement('strong');
    heading.textContent = 'Two perspectives. One thread.';
    const description = document.createElement('p');
    description.textContent =
      'Start with a question on the left. ChatGPT and Claude will work through it together, with you in control.';
    const tags = document.createElement('div');
    tags.className = 'empty-tags';
    tags.textContent =
      'Explore ideas  ·  Challenge assumptions  ·  Find clarity';
    d.append(icon, heading, description, tags);
    root.append(d);
  }
  for (const m of s.history) {
    const div = document.createElement('div');
    div.className =
      'entry ' + (m.who === 'Claude' ? 'claude' : m.who === 'You' ? 'you' : '');
    if (m.kind === 'control') div.classList.add('control');
    const meta = document.createElement('div');
    meta.className = 'meta';
    const who = document.createElement('strong');
    who.textContent = m.who;
    const time = document.createElement('span');
    time.textContent = new Date(m.at).toLocaleTimeString();
    meta.append(who, time);
    const body = document.createElement('div');
    body.className = 'body';
    body.textContent = m.text;
    div.append(meta, body);
    root.append(div);
  }
  scrollToLatest();
  requestAnimationFrame(scrollToLatest);
  if (s.error) error(new Error(s.error));
  else clearError();
}
async function tabs() {
  const list = await ask({ type: 'LIST_TABS' });
  for (const [id, domain] of [
    ['chatgpt', 'chatgpt.com'],
    ['claude', 'claude.ai'],
  ]) {
    const select = $(id),
      prev =
        Number(select.value) ||
        state?.[id === 'chatgpt' ? 'chatgptTab' : 'claudeTab'];
    const matches = list.filter((t) => new URL(t.url).hostname === domain);
    select.replaceChildren();
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = `Choose ${id} tab`;
    select.append(empty);
    for (const t of matches) {
      const o = document.createElement('option');
      o.value = t.id;
      o.textContent = `${t.title} (#${t.id})`;
      select.append(o);
    }
    select.value =
      matches.length === 1
        ? String(matches[0].id)
        : matches.some((t) => t.id === prev)
          ? String(prev)
          : '';
  }
}
async function configure() {
  await ask({
    type: 'CONFIG',
    chatgptTab: Number($('chatgpt').value) || null,
    claudeTab: Number($('claude').value) || null,
    automatic: $('mode').value === 'automatic',
    allowUserInput: $('allowUserInput').checked,
    maxRounds: $('unlimited').checked ? null : Number($('maxRounds').value),
  });
}
$('unlimited').onchange = () => {
  $('maxRounds').disabled = $('unlimited').checked;
};
$('refresh').onclick = () => safely(tabs);
$('openChat').onclick = () =>
  chrome.tabs.create({ url: 'https://chatgpt.com/' });
$('openClaude').onclick = () =>
  chrome.tabs.create({ url: 'https://claude.ai/' });
$('start').onclick = () =>
  safely(async () => {
    await configure();
    const s = await ask({ type: 'START', text: $('topic').value.trim() });
    render(s);
  });
$('stop').onclick = () =>
  safely(async () => render(await ask({ type: 'STOP' })));
$('stopTop').onclick = $('stop').onclick;
$('reset').onclick = () =>
  safely(async () => {
    if (confirm('Clear AI Relay conversation history?'))
      render(await ask({ type: 'RESET' }));
  });
$('sendReply').onclick = () =>
  safely(async () => {
    const text = $('userReply').value.trim();
    if (!text) throw Error('Enter your answer before resuming.');
    $('sendReply').disabled = true;
    try {
      render(await ask({ type: 'USER_REPLY', text }));
      $('userReply').value = '';
    } finally {
      $('sendReply').disabled = !!state?.running;
    }
  });
$('forward').onclick = () =>
  safely(async () => render(await ask({ type: 'FORWARD' })));
$('interject').onclick = () =>
  safely(async () => {
    const text = $('interjection').value.trim();
    if (!text) throw Error('Enter a message first');
    await configure();
    render(
      await ask({
        type: 'INTERJECT',
        text,
        destination: $('destination').value,
      }),
    );
    $('interjection').value = '';
  });
$('export').onclick = () => {
  if (!state) return;
  const md =
    '# AI Relay conversation\n\n' +
    state.history
      .map(
        (m) =>
          `## ${m.who} — ${new Date(m.at).toLocaleString()}\n\n${m.text}\n`,
      )
      .join('\n');
  const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ai-relay-conversation.md';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'STATE') render(msg.state);
});
(async () => {
  render(await ask({ type: 'GET' }));
  $('mode').value = state.automatic ? 'automatic' : 'manual';
  $('allowUserInput').checked = state.allowUserInput !== false;
  $('unlimited').checked = state.maxRounds === null;
  $('maxRounds').disabled = $('unlimited').checked;
  $('maxRounds').value = state.maxRounds ?? 8;
  await tabs();
})().catch(error);
