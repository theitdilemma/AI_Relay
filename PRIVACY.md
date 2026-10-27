# AI Relay Privacy Policy

Developer: Kelly Hansen. Effective date: October 26, 2026.

Canonical policy: https://github.com/theitdilemma/AI_Relay/blob/main/PRIVACY.md

Privacy questions: https://github.com/theitdilemma/AI_Relay/issues (do not include private conversation text).

AI Relay runs locally as a Chrome extension. It has no backend service, analytics, tracking, or telemetry.

## What is stored

Chrome local extension storage contains selected tab IDs, relay settings and state, the original prompt, a pending response or question awaiting your input, and up to 300 conversation-history entries. It also remembers up to 200 provider conversation URLs that have already received the introduction. This storage is not Chrome Sync. Markdown exports are saved wherever you choose to download them.

## Where text goes

Starting or forwarding fills and submits the destination website's composer. ChatGPT and Claude receive that text through your signed-in sessions and process it under their own policies. The first forward to the second model includes the original prompt and the response from the starting model. AI Relay does not make separate API requests or upload history to another server.

## Permissions

| Permission                                     | Purpose                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `storage`                                      | Saves relay state, settings, and history locally.                                       |
| `scripting`                                    | Attaches the extension's own scripts to already-open supported tabs after installation. |
| `https://chatgpt.com/*`, `https://claude.ai/*` | Reads replies and operates composer controls on these two sites.                        |

## Removing data

**Clear history** clears extension conversation history, the original prompt, pending response, and unanswered input request. Settings, introduction tracking, and provider website chats remain. Introduction tracking is preserved so an existing chat does not get the setup message again. Removing the extension in `chrome://extensions` removes its local extension storage. Delete Markdown exports separately. Provider chat deletion is managed on each provider's website.

Do not post private conversation exports in public bug reports.

## Data use and sharing

AI Relay reads conversation text and supported-tab titles and URLs only to connect the selected chats, capture responses, prevent repeated introductions, and perform the relay you start. Prompts and responses can contain personal information you choose to enter. The extension does not read passwords, authentication tokens, payment information, or unrelated browsing history. It operates the signed-in website interface without extracting your account credentials.

Starting a run authorizes the described text handoffs. Automatic mode continues these handoffs until stopped, paused, limited, or interrupted; you can choose manual approval instead. The destination providers are OpenAI (ChatGPT) and Anthropic (Claude). Their handling of submitted text is governed by their respective policies and your account settings.

Kelly Hansen and AI Relay contributors do not receive conversation data through an extension backend, sell user data, use it for advertising, or use it for creditworthiness or lending decisions. User data is used only to provide the extension's stated conversation-relay functionality. AI Relay's use of user data complies with the Chrome Web Store User Data Policy, including its Limited Use requirements. No remote executable code is loaded; all extension logic ships in the package.

Data remains locally stored until cleared, replaced by bounded-history retention, or removed with the extension; it is not automatically removed when a run ends. Introduction tracking and settings survive Clear history. Uninstall to remove all extension-local records. Exports and provider-side chats must be deleted separately. Local storage is not an encrypted vault: protect your browser profile and device.

## Changes

Material changes to handling will be reflected here and in the release notes. Check the effective date and GitHub history for policy revisions.
