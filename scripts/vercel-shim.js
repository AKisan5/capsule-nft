// Patches os.hostname() to return ASCII before Vercel CLI runs.
// Fixes: "れもんラップトップ @ vercel X.Y.Z is not a legal HTTP header value"
const os = require('os');
os.hostname = () => 'capsule-dev';

const path = require('path');
const vcPath = path.join(
  process.env.APPDATA || '',
  'npm/node_modules/vercel/dist/vc.js',
);
require(vcPath);
