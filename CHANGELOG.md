# Changelog

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
