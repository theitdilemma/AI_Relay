# Contributing

This is an early Chrome extension prototype. Small, reproducible fixes are welcome, especially for site selector changes and relay reliability.

## Checks

Use Node.js 22 or newer. Run `npm ci`, `npm run check`, `npm test`, and `npm run format:check`. Format changes with `npm run format`. Runtime files do not require compilation.

## Bugs

Include extension and Chrome versions, affected site, exact error, relay mode, and steps to reproduce. Say whether a message was pasted, submitted, or captured. Use harmless example prompts and remove credentials, cookies, account details, and private conversations.

## Tests

Keep regression tests focused on user-visible behavior. Tests mock browser APIs and DOM elements; they do not prove compatibility with current live websites. Describe any signed-in testing you performed and any untested cases.

## Packaging

Keep `package.json`, `manifest.json`, and the build constant in `content.js` on the same version. Connection tests read the manifest version. `npm run package` copies only extension files and user documentation to `dist/ai-relay`. Never package conversation exports, browser profiles, credentials, or `node_modules`.
