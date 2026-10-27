const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = (file) =>
  fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, '');
const manifest = JSON.parse(read('manifest.json'));
const pkg = JSON.parse(read('package.json'));
assert.equal(
  manifest.version,
  pkg.version,
  'Package and extension versions must match',
);
assert.equal(
  read('content.js').match(/const build = ['"]([^'"]+)['"]/)[1],
  manifest.version,
  'Content-script version must match',
);
const scripts = [
  manifest.background.service_worker,
  'dashboard.js',
  ...manifest.content_scripts.flatMap((entry) => entry.js),
];
for (const file of new Set(scripts))
  new vm.Script(read(file), { filename: file });
assert.deepEqual(manifest.host_permissions, [
  'https://chatgpt.com/*',
  'https://claude.ai/*',
]);
const html = read('dashboard.html');
assert.deepEqual(manifest.permissions, ['storage', 'scripting']);
assert.ok(
  html.includes(
    'https://github.com/theitdilemma/AI_Relay/blob/main/PRIVACY.md',
  ),
  'Dashboard must expose the public privacy disclosure',
);
for (const [size, file] of Object.entries(manifest.icons || {})) {
  const png = fs.readFileSync(path.join(root, file));
  assert.equal(png.readUInt32BE(16), Number(size), `Wrong icon width: ${file}`);
  assert.equal(
    png.readUInt32BE(20),
    Number(size),
    `Wrong icon height: ${file}`,
  );
}
for (const match of html.matchAll(/(?:src|href)="([^":]+)"/g)) {
  assert.ok(
    fs.existsSync(path.join(root, match[1])),
    `Missing dashboard asset: ${match[1]}`,
  );
}
for (const match of read('dashboard.js').matchAll(/\$\(['"]([^'"]+)['"]\)/g)) {
  assert.ok(
    html.includes(`id="${match[1]}"`),
    `Missing dashboard control: ${match[1]}`,
  );
}
console.log(
  'Manifest, versions, dashboard controls and JavaScript syntax passed.',
);
