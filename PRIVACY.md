# Privacy

AI Relay runs locally as a Chrome extension. It has no backend service, analytics, tracking, or telemetry.

## What is stored

Chrome local extension storage contains selected tab IDs, relay settings and state, the original prompt, a pending response, and up to 300 conversation-history entries. This storage is not Chrome Sync. Markdown exports are saved wherever you choose to download them.

## Where text goes

Starting or forwarding fills and submits the destination website's composer. ChatGPT and Claude receive that text through your signed-in sessions and process it under their own policies. The first forward to Claude includes the original prompt and ChatGPT's reply. AI Relay does not make separate API requests or upload history to another server.

## Permissions

| Permission                                     | Purpose                                                                                                                                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabs`                                         | Lists open tabs so you can select conversations. Chrome may describe this as browsing-history access; the extension does not use the history API or store a browsing-history log. |
| `storage`                                      | Saves relay state, settings, and history locally.                                                                                                                                 |
| `scripting`                                    | Attaches the extension's own scripts to already-open supported tabs after installation.                                                                                           |
| `https://chatgpt.com/*`, `https://claude.ai/*` | Reads replies and operates composer controls on these two sites.                                                                                                                  |

## Removing data

**Reset history** clears extension conversation history, the original prompt, and pending response. Settings and provider website chats remain. Removing the extension in `chrome://extensions` removes its local extension storage. Delete Markdown exports separately. Provider chat deletion is managed on each provider's website.

Do not post private conversation exports in public bug reports.
