import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.resolve(root, 'dist');
// Only clear this project's build output; source and runtime data are excluded.
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== 'dist') throw new Error('Invalid build output');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const directory of ['admin', 'djpics', 'vids', 'studio']) {
  fs.cpSync(path.join(root, directory), path.join(output, directory), { recursive: true });
}
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile() && /\.(?:html|png|jpe?g|webp|ico|svg|gif|txt|xml|webmanifest|css|js)$/i.test(entry.name)) {
    fs.copyFileSync(path.join(root, entry.name), path.join(output, entry.name));
  }
}
console.log('Packaged public website, studio and Song Creator into dist/.');
