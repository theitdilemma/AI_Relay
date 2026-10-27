// Keep release packages free of tests, tooling and local files.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'ai-relay');
fs.mkdirSync(output, { recursive: true });
const files = [
  'manifest.json',
  'background.js',
  'content.js',
  'dashboard.html',
  'dashboard.js',
  'style.css',
  'adapters/chatgpt.js',
  'adapters/claude.js',
  'README.md',
  'LICENSE',
  'DISCLAIMER.md',
  'legal.html',
  'PRIVACY.md',
  'docs/dashboard.png',
  'icons/logo.svg',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
  'icons/icon-256.png',
];
for (const file of files) {
  const target = path.join(output, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, file), target);
}
console.log(`Extension package prepared: ${output}`);
