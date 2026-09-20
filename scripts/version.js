import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const { version, gameRelease } = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const release = { version, name: gameRelease.name, note: gameRelease.note };

await writeFile(new URL('src/version.js', root), `// Generated from package.json. Do not edit.\nexport const RELEASE = ${JSON.stringify(release)};\n`);
