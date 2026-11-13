// Mengacak (obfuscate) kode aplikasi setelah build agar tidak terbaca di DevTools.
// Pustaka pihak ketiga (vendor-*) tidak diacak karena kodenya memang publik.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import JavaScriptObfuscator from 'javascript-obfuscator';

const dir = 'dist/assets';
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js') || f.startsWith('vendor')) continue;
  const p = join(dir, f);
  const out = JavaScriptObfuscator.obfuscate(readFileSync(p, 'utf8'), {
    compact: true,
    target: 'browser',
    sourceType: 'module',
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    splitStrings: true,
    splitStringsChunkLength: 8,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.3,
    deadCodeInjection: false,
    selfDefending: false,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
  });
  writeFileSync(p, out.getObfuscatedCode());
  console.log('obfuscated', f);
}
