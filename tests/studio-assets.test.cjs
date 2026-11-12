const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'studio/index.html'), 'utf8');
const assets = [
  ...Array.from(html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g), m => m[1]),
  ...Array.from(html.matchAll(/new Worker\(['"]([^'"]+)['"]\)/g), m => m[1]),
  ...Array.from(html.matchAll(/<iframe\b[^>]*\bdata-src="([^"]+)"/g), m => m[1]).filter(asset => !asset.includes('/song-creator/')),
].filter(asset => !/^(?:https?:|data:|\/\/)/.test(asset));
assert(assets.length >= 5, 'must check styles, scripts and audio workers');
for (const route of ['/studio', '/studio/', '/studio/index.html']) {
  for (const asset of assets) {
    const url = new URL(asset, `https://example.test${route}`);
    assert(url.pathname.startsWith('/studio/'), `${route} resolves ${asset} outside studio`);
    assert(fs.statSync(path.join(root, url.pathname)).isFile(), `${route}: missing ${url.pathname}`);
  }
}
console.log('Studio asset URLs resolve correctly with and without a trailing slash.');
const fixRoom = fs.readFileSync(path.join(root, 'studio/fix-room/index.html'), 'utf8');
for (const match of fixRoom.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)) {
  if (/^https?:/.test(match[1])) continue;
  assert(fs.statSync(path.join(root, 'studio/fix-room', match[1])).isFile(), `Missing Fix Room asset: ${match[1]}`);
}
assert(fs.statSync(path.join(root, 'studio/fix-room/fix-room-engine.js')).isFile(), 'Fix Room Worker must be packaged');
