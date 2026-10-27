# Changelog

## 0.4.5 — 2026-10-26

- Replaces the starting-model dropdown with a compact ⇆ button under Connections. The connection rows and thread participants reorder together.
- Moves the opening prompt into the Conversation panel. A successful Start replaces the prompt with the live thread; failed starts keep the draft visible for retry.
- Adds New conversation and Back to conversation controls without deleting existing history.
- Removes the separate left-side starter card and keeps the Stop button in the sticky header.

## 0.4.4 — 2026-10-26

- Adds **Who starts?** under Connections to select ChatGPT → Claude or Claude → ChatGPT. The connection rows reorder to match, and the choice is saved when starting.
- Sends the starting prompt to the selected model and includes the original prompt when its first response reaches the other model, in either direction.
- Blank starts arm the selected model. ChatGPT remains the default.

## 0.4.3 — 2026-10-26

- Adds a Stop button to the sticky top bar, accessible while scrolling. Stop also cancels a pending user-input request.
- Adds a saved **Allow #userInput# requests** setting, enabled by default and applied when starting a run.
- With input requests disabled, new introductions omit that flag and tell models to continue with explicit assumptions. Old chats' flagged replies are forwarded without the flag or an input pause; a bare flag ends the run rather than looping an empty message.

## 0.4.2 — 2026-10-26

- Keeps conversation history in a bounded scroll pane instead of letting messages expand the dashboard.
- Automatically scrolls to the latest message after each update and when the viewport changes.

## 0.4.1 — 2026-10-26

- Fixes `Uncaught (in promise) Error: No current window` when opening the dashboard during installation or update.
- Uses the toolbar click's window explicitly, with a new normal-window fallback when Chrome has no usable current window.
- Handles background event failures and rejected state saves without unhandled promise rejections.
- Adds regression coverage for missing/closed windows and failed dashboard opening.

## 0.4.0 — 2026-10-26

- Adds `#userInput#`: either AI can ask a question and pause the relay; the dashboard sends your reply back to that AI and resumes without resetting the forward count.
- Sends the Kelly Hansen / AI Relay introduction once per provider conversation. Chat URLs and visible setup messages prevent repeated introductions on follow-up turns and later runs in the same chat.
- Separates `#stop#` (finished) from `#userInput#` (needs a decision). Instructions are part of the initial introduction rather than repeated on every forwarded message.
- Replaces the stacked dashboard with compact left-side controls and a larger right-side conversation workspace, with responsive layouts and a dedicated reply-and-resume panel.
- Adds a speech-bubble relay icon in all Chrome extension sizes and a dashboard favicon.
- Preserves unanswered questions on failed replies and refuses to send an answer if the asking tab has changed conversations.

## 0.3.1 — 2026-10-26

- Reinforces the `#stop#` instruction on every forwarded turn to prevent closing-acknowledgment loops.
- Recognizes a standalone stop marker even when message wrappers include controls, timestamps, or screen-reader labels.
- Shows the completion reason in the conversation panel. A stop signal from either model stops forwarding and preserves history.
- Keeps exact matching: mentioning or quoting `#stop#` inside an ordinary response does not stop the relay.

## 0.3.0 — 2026-10-26

First shareable testing release.

- Relays conversations between ChatGPT and Claude, including the original prompt in Claude's first message.
- Manual approval, automatic forwarding, finite limits, and unlimited mode.
- Automatic selection when only one tab per site is open.
- Pause, interjections, local history, and Markdown export.
- Exact `#stop#` responses stop forwarding; a stopping instruction is supplied to both models when starting a prompted run.
- Running state survives background service-worker sleep.
- Handles delayed Send buttons, replaced editors, normalized multiline drafts, and unconfirmed sends.
- Adds regression tests, formatting, an optional GitHub Actions template, installation and privacy documentation, and an allowlisted release package.

The 0.2.x development iterations were tested locally. Website selectors and generation-completion detection remain heuristic.
