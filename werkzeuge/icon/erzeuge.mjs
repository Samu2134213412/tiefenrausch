import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const WWW = path.join(HIER, '..', '..', 'www', 'bilder');
const quelle = pathToFileURL(path.join(HIER, 'icon-quelle.html')).href;

const b = await chromium.launch();
for (const groesse of [1024, 512, 192, 144, 96]) {
  const ctx = await b.newContext({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: groesse / 1024 });
  const p = await ctx.newPage();
  await p.goto(quelle, { waitUntil: 'networkidle' });
  await p.waitForTimeout(200);
  const ziel = groesse === 1024
    ? path.join(HIER, 'icon-1024.png')
    : path.join(WWW, `icon-${groesse}.png`);
  await p.screenshot({ path: ziel });
  await ctx.close();
  console.log(`icon ${groesse}px -> ${path.basename(ziel)}`);
}
await b.close();
