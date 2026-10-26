window.AIRelayAdapter = {
  name: 'ChatGPT',
  messages: [
    '[data-message-author-role="assistant"]',
    '[data-markdown-text-style="assistant-message"]',
  ],
  composer: [
    '#prompt-textarea',
    '[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"][role="textbox"]',
  ],
  send: [
    'button[data-testid="send-button"]',
    'button[aria-label="Send prompt"]',
    'button[aria-label="Send message"]',
    'button[aria-label="Send"]',
  ],
  busy: [
    'button[data-testid="stop-button"]',
    'button[aria-label*="Stop streaming"]',
    'button[aria-label*="Stop generating"]',
  ],
};
