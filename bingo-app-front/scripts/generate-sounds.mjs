import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sounds', 'bingo');
const ENDPOINT = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=';

function letterFor(n) {
  if (n >= 1 && n <= 15) return 'B';
  if (n >= 16 && n <= 30) return 'I';
  if (n >= 31 && n <= 45) return 'N';
  if (n >= 46 && n <= 60) return 'G';
  return 'O';
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error(`Empty response for ${url}`);
  return buf;
}

for (let n = 1; n <= 75; n++) {
  const letter = letterFor(n);
  const text = `${letter} ${n}`;
  const file = join(OUT_DIR, `${letter.toLowerCase()}-${n}.mp3`);
  try {
    const buf = await download(`${ENDPOINT}${encodeURIComponent(text)}`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, buf);
    console.log(`ok ${file} (${buf.length} bytes)`);
  } catch (err) {
    console.error(`fail ${file}: ${err.message}`);
    process.exitCode = 1;
  }
}