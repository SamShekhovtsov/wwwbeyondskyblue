import { cp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const source = resolve(root, 'public');
const output = resolve(root, 'dist');

await rm(output, { recursive: true, force: true });
await cp(source, output, {
  recursive: true,
  filter: (path) => !path.includes(`${resolve(source, 'screenshot.jpeg')}`),
});

console.log(`Built static site into ${output}`);
