/* build.mjs — Copie les assets web vers www/ pour Capacitor */
import { cpSync, mkdirSync, rmSync } from 'fs';

const OUT = 'www';

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const items = ['index.html', 'css', 'js', 'assets', 'icon.png', 'manifest.json', 'sw.js'];
for (const item of items) {
  cpSync(item, `${OUT}/${item}`, { recursive: true });
}

console.log(`✓ Build terminé → ${OUT}/`);
