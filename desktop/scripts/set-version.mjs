// Set the desktop app version everywhere it lives:
//   node scripts/set-version.mjs 0.2.0
// Then commit, and push the tag desktop-v0.2.0 to build and publish the update.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version || '')) {
  console.error('Usage: node scripts/set-version.mjs <major.minor.patch>   e.g. 0.2.0');
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const edit = (file, fn) => {
  const p = join(root, file);
  writeFileSync(p, fn(readFileSync(p, 'utf8')));
  console.log(`updated ${file}`);
};
edit('package.json', (s) => s.replace(/"version":\s*"[^"]+"/, `"version": "${version}"`));
edit('src-tauri/tauri.conf.json', (s) => s.replace(/"version":\s*"[^"]+"/, `"version": "${version}"`));
edit('src-tauri/Cargo.toml', (s) => s.replace(/^version = "[^"]+"/m, `version = "${version}"`));
console.log(`\nNext: git commit -am "Desktop ${version}" && git tag desktop-v${version} && git push && git push origin desktop-v${version}`);
