// ESM shim: patches os.hostname() before the Vercel CLI ESM graph loads.
// Needed because the Windows hostname contains Japanese chars, which breaks HTTP headers.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';

// Monkey-patch before any Vercel import resolves
os.hostname = () => 'capsule-dev';

const appdata = process.env.APPDATA ?? '';
const vcPath = path.join(appdata, 'npm/node_modules/vercel/dist/vc.js');
const vcUrl = new URL(`file:///${vcPath.replace(/\\/g, '/')}`).href;

await import(vcUrl);
