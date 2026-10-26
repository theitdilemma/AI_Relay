const DEFAULT = {
  chatgptTab: null,
  claudeTab: null,
  running: false,
  automatic: true,
  rounds: 0,
  maxRounds: 8,
  history: [],
  pending: null,
  error: null,
  originalPrompt: '',
  claudeHasContext: false,
  stopReason: null,
};
const STOP_RULE =
  'When the discussion is complete, or further progress requires human input, respond with exactly #stop# and nothing else.';
let state = { ...DEFAULT };
const save = () => chrome.storage.local.set({ relayState: state });
const emit = () => {
  save();
  chrome.runtime.sendMessage({ type: 'STATE', state }).catch(() => {});
};
const nameFor = (tabId) =>
  tabId === state.chatgptTab
    ? 'ChatGPT'
    : tabId === state.claudeTab
      ? 'Claude'
      : null;
const targetFor = (platform) =>
  platform === 'ChatGPT' ? state.claudeTab : state.chatgptTab;
const limitReached = () =>
  state.maxRounds !== null && state.rounds >= state.maxRounds;
const forwardText = (from, text) =>
  from === 'ChatGPT' && !state.claudeHasContext && state.originalPrompt
    ? `Original prompt from the user:\n\n${state.originalPrompt}\n\nChatGPT's response:\n\n${text}\n\nContinue the discussion using the original prompt and this response as context.\n\nRelay stopping rule: ${STOP_RULE}`
    : `Message from ${from}:\n\n${text}`;
async function forwardTo(from, text) {
  await sendTo(targetFor(from), forwardText(from, text));
  if (from === 'ChatGPT') state.claudeHasContext = true;
}
const record = (who, text, kind = 'message') => {
  state.history.push({ who, text, kind, at: new Date().toISOString() });
  state.history = state.history.slice(-300);
  emit();
};
async function sendTo(tabId, text) {
  if (!Number.isInteger(tabId)) throw Error('Target tab not selected');
  await checkTab(tabId);
  const r = await chrome.tabs.sendMessage(tabId, { type: 'SEND', text });
  if (!r?.ok) throw Error(r?.error || 'Could not send message');
}
async function checkTab(tabId) {
  const platform = nameFor(tabId) || 'AI';
  let r;
  try {
    r = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch (e) {
    if (
      !/Receiving end does not exist|Could not establish connection/i.test(
        e.message,
      )
    )
      throw e;
    // Reinstalling an extension leaves already-open pages without its scripts.
    // Inject only the declared scripts for a supported site; preserve drafts.
    try {
      const tab = await chrome.tabs.get(tabId);
      const url = new URL(tab.url);
      if (
        url.protocol !== 'https:' ||
        !['chatgpt.com', 'claude.ai'].includes(url.hostname)
      )
        throw Error('Select a ChatGPT or Claude website tab');
      if (
        (platform === 'ChatGPT' && url.hostname !== 'chatgpt.com') ||
        (platform === 'Claude' && url.hostname !== 'claude.ai')
      )
        throw Error(
          'Selected tab is for the other AI. Refresh the dashboard tab list',
        );
      const adapter = url.hostname === 'chatgpt.com' ? 'chatgpt' : 'claude';
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [`adapters/${adapter}.js`, 'content.js'],
      });
      r = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    } catch (connectionError) {
      throw Error(
        `Cannot connect to ${platform}. Refresh that website tab, then click Refresh tabs in AI Relay and select it again. ${connectionError.message}`,
      );
    }
  }
  if (r?.build !== chrome.runtime.getManifest().version)
    throw Error(
      `${platform} has an older AI Relay content script. Reload AI Relay in chrome://extensions, then refresh the ${platform} tab.`,
    );
  if (!r.composer)
    throw Error(
      `Composer not found in ${platform}. Site layout may have changed.`,
    );
}
async function stop(reason = null) {
  state.running = false;
  state.pending = null;
  state.stopReason = reason;
  for (const id of [state.chatgptTab, state.claudeTab])
    if (id) chrome.tabs.sendMessage(id, { type: 'DISARM' }).catch(() => {});
  emit();
}
// MV3 workers sleep between events. Waking one must resume saved relay state.
const ready = chrome.storage.local.get('relayState').then(({ relayState }) => {
  if (relayState) state = { ...DEFAULT, ...relayState };
});
chrome.runtime.onInstalled.addListener(() =>
  ready.then(async () => {
    await stop();
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  }),
);
chrome.runtime.onStartup.addListener(() => ready.then(stop));
chrome.action.onClicked.addListener(() =>
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') }),
);
chrome.tabs.onRemoved.addListener((id) => {
  ready.then(() => {
    if (id === state.chatgptTab || id === state.claudeTab) {
      if (id === state.chatgptTab) state.chatgptTab = null;
      else state.claudeTab = null;
      stop();
    }
  });
});
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  (async () => {
    await ready;
    if (msg.type === 'GET') return state;
    if (msg.type === 'LIST_TABS')
      return (await chrome.tabs.query({}))
        .filter((t) =>
          /^https:\/\/(chatgpt\.com|claude\.ai)\//.test(t.url || ''),
        )
        .map((t) => ({ id: t.id, title: t.title, url: t.url }));
    if (msg.type === 'CONFIG') {
      await stop();
      state.error = null;
      state.chatgptTab = msg.chatgptTab;
      state.claudeTab = msg.claudeTab;
      state.automatic = !!msg.automatic;
      state.maxRounds =
        msg.maxRounds === null
          ? null
          : Math.max(1, Math.min(30, Number(msg.maxRounds) || 8));
      emit();
      return state;
    }
    if (msg.type === 'START') {
      if (!state.chatgptTab || !state.claudeTab)
        throw Error('Select both tabs first');
      for (const id of [state.chatgptTab, state.claudeTab]) await checkTab(id);
      state.running = true;
      state.rounds = 0;
      state.pending = null;
      state.error = null;
      state.originalPrompt = msg.text?.trim() || '';
      state.claudeHasContext = false;
      state.stopReason = null;
      emit();
      if (msg.text?.trim()) {
        try {
          await sendTo(
            state.chatgptTab,
            `${msg.text.trim()}\n\nRelay stopping rule: ${STOP_RULE}`,
          );
          record('You', msg.text.trim());
        } catch (e) {
          await stop();
          throw e;
        }
      } else {
        await chrome.tabs.sendMessage(state.chatgptTab, { type: 'ARM' });
      }
      return state;
    }
    if (msg.type === 'STOP') {
      await stop();
      return state;
    }
    if (msg.type === 'RESET') {
      await stop();
      state.history = [];
      state.rounds = 0;
      state.error = null;
      state.originalPrompt = '';
      state.claudeHasContext = false;
      emit();
      return state;
    }
    if (msg.type === 'INTERJECT') {
      if (!state.chatgptTab || !state.claudeTab)
        throw Error('Select tabs first');
      const ids =
        msg.destination === 'both'
          ? [state.chatgptTab, state.claudeTab]
          : [msg.destination === 'Claude' ? state.claudeTab : state.chatgptTab];
      // Stop automatic forwarding when interjecting; avoids crossing concurrent messages.
      await stop();
      for (const id of ids) await sendTo(id, msg.text);
      record('You', msg.text);
      return state;
    }
    if (msg.type === 'FORWARD') {
      if (!state.pending) throw Error('No pending response');
      const { from, text } = state.pending;
      await forwardTo(from, text);
      state.pending = null;
      state.rounds++;
      if (limitReached()) await stop();
      emit();
      return state;
    }
    if (msg.type === 'RESPONSE') {
      const from = nameFor(sender.tab?.id);
      if (!from || from !== msg.platform || !state.running || !msg.text?.trim())
        return state;
      if (msg.text.trim().toLowerCase() === '#stop#') {
        state.error = null;
        await stop('Discussion finished or awaiting your input');
        record(
          from,
          'Discussion finished or awaiting your input. (#stop#)',
          'control',
        );
        return state;
      }
      if (state.pending) return state;
      record(from, msg.text);
      if (limitReached()) {
        await stop();
        return state;
      }
      state.pending = { from, text: msg.text };
      emit();
      if (state.automatic) {
        try {
          await forwardTo(from, msg.text);
          state.pending = null;
          state.rounds++;
          if (limitReached()) await stop();
          emit();
        } catch (e) {
          state.error = e.message;
          state.automatic = false;
          emit();
        }
      }
      return state;
    }
    return state;
  })()
    .then(respond)
    .catch((e) => {
      state.error = e.message;
      emit();
      respond({ error: e.message });
    });
  return true;
});
