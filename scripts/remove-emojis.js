#!/usr/bin/env node
// scans repository and replaces/removes emoji glyphs in text files
// Usage: node scripts/remove-emojis.js

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
// NOTE: For aggressive, we include build output and logs too. Keep .git and node_modules ignored.
const IGNORE_DIRS = new Set(['.git', 'node_modules', '.vs']);
const TEXT_EXT = new Set(['.js', '.ts', '.jsx', '.tsx', '.html', '.htm', '.css', '.md', '.json', '.yml', '.yaml', '.ps1', '.sh', '.txt']);

// mapping of common emojis to plain text replacements
const mapping = {
  '[OK]': '[OK]',
  '[FAIL]': '[FAIL]',
  '[WARN]': '[WARN]',
  '[WARN]': '[WARN]',
  'Demo': 'Demo',
  '': '',
  '': '',
  '': '',
  '': '',
  'Metrics': 'Metrics',
  'Target': 'Target',
  'Secure': 'Secure',
  'Test': 'Test',
  '': 'Package',
  '': '',
  'Tools': 'Tools',
  'Secure': 'Secure',
  '': '',
  '': '',
  '': '',
  '': '',
  '': '',
  '': '',
  '': '',
  '': ''
};

// regex to match a broad range of emoji/unicode pictographs
const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

let changedFiles = [];

function shouldProcess(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (TEXT_EXT.has(ext)) return true;
  // also process files without extension (like Dockerfile, Makefile, etc.)
  const base = path.basename(filePath);
  if (!base.includes('.')) return true;
  return false;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile()) {
      if (!shouldProcess(full)) continue;
      try {
        const content = fs.readFileSync(full, 'utf8');
        if (!emojiRegex.test(content)) continue;
        let newContent = content;
        // first replace mapped emojis
        for (const [k, v] of Object.entries(mapping)) {
          if (newContent.includes(k)) {
            newContent = newContent.split(k).join(v);
          }
        }
        // remove remaining emoji-like chars
        newContent = newContent.replace(emojiRegex, '');
        if (newContent !== content) {
          fs.writeFileSync(full, newContent, 'utf8');
          changedFiles.push(full);
          console.log('Updated:', path.relative(root, full));
        }
      } catch (err) {
        console.error('Error processing', full, err.message);
      }
    }
  }
}

console.log('Starting emoji removal scan from', root);
walk(root);

console.log('\nDone. Files changed:', changedFiles.length);
if (changedFiles.length > 0) console.log(changedFiles.join('\n'));

process.exit(0);
