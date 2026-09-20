import './version.js';
import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
const assets = ['index.html', 'src/app.js', 'src/game.js', 'src/events.js', 'src/style.css', 'src/version.js'];

await rm(output, { recursive: true, force: true });
await mkdir(new URL('src/', output), { recursive: true });
await Promise.all(assets.map(file => copyFile(new URL(file, root), new URL(file, output))));
await cp(new URL('public/', root), output, { recursive: true });

// Share metadata must be present before JavaScript runs. Pages is the default
// public address; SITE_URL can point a deployment at a different public origin.
const siteUrl = new URL(process.env.SITE_URL || 'https://humaninc.pages.dev');
if (!['http:', 'https:'].includes(siteUrl.protocol)) throw new Error('SITE_URL must be an HTTP(S) URL');
const html = await readFile(new URL('index.html', output), 'utf8');
await writeFile(new URL('index.html', output), html.replaceAll('https://humaninc.pages.dev', siteUrl.origin));

console.log(`Built ${assets.length} app files and public icons in dist/ (share origin: ${siteUrl.origin})`);
