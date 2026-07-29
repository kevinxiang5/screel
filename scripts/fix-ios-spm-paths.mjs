/**
 * Capacitor on Windows writes backslash paths into CapApp-SPM/Package.swift.
 * Swift treats `\n` as a newline, so Mac Xcode cannot resolve local plugins.
 * Normalize all local package paths to POSIX separators after `cap sync`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'ios', 'App', 'CapApp-SPM', 'Package.swift');

let source = readFileSync(pkgPath, 'utf8');
const next = source.replace(/path:\s*"([^"]+)"/g, (_match, rawPath) => {
  const normalized = String(rawPath).replace(/\\/g, '/');
  return `path: "${normalized}"`;
});

if (next !== source) {
  writeFileSync(pkgPath, next);
  console.log('Normalized CapApp-SPM Package.swift paths for macOS.');
} else {
  console.log('CapApp-SPM Package.swift paths already POSIX.');
}
