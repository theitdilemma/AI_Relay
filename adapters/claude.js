window.AIRelayAdapter = {
  name: 'Claude',
  messages: [
    '[data-testid="assistant-message"]',
    '.font-claude-message',
    '[data-is-streaming] .font-claude-message',
  ],
  composer: [
    '[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"][role="textbox"]',
    '.ProseMirror[contenteditable="true"]',
  ],
  send: [
    'button[aria-label="Send"]',
    'button[aria-label="Send Message"]',
    'button[aria-label="Send message"]',
    'button[data-testid="send-button"]',
  ],
  busy: [
    'button[aria-label*="Stop response"]',
    'button[aria-label*="Stop generating"]',
    'button[data-testid="stop-button"]',
  ],
};
