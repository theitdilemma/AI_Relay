# Privacy

AI Relay runs locally as a Chrome extension. It has no backend service, analytics, tracking, or telemetry.

## What is stored

Chrome local extension storage contains selected tab IDs, relay settings and state, the original prompt, a pending response or question awaiting your input, and up to 300 conversation-history entries. It also remembers up to 200 provider conversation URLs that have already received the introduction. This storage is not Chrome Sync. Markdown exports are saved wherever you choose to download them.

## Where text goes

Starting or forwarding fills and submits the destination website's composer. ChatGPT and Claude receive that text through your signed-in sessions and process it under their own policies. The first forward to the second model includes the original prompt and the response from the starting model. AI Relay does not make separate API requests or upload history to another server.

## Permissions

| Permission                                     | Purpose                                                                                                                                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabs`                                         | Lists open tabs so you can select conversations. Chrome may describe this as browsing-history access; the extension does not use the history API or store a browsing-history log. |
| `storage`                                      | Saves relay state, settings, and history locally.                                                                                                                                 |
| `scripting`                                    | Attaches the extension's own scripts to already-open supported tabs after installation.                                                                                           |
| `https://chatgpt.com/*`, `https://claude.ai/*` | Reads replies and operates composer controls on these two sites.                                                                                                                  |

## Removing data

**Clear history** clears extension conversation history, the original prompt, pending response, and unanswered input request. Settings, introduction tracking, and provider website chats remain. Introduction tracking is preserved so an existing chat does not get the setup message again. Removing the extension in `chrome://extensions` removes its local extension storage. Delete Markdown exports separately. Provider chat deletion is managed on each provider's website.

Do not post private conversation exports in public bug reports.
