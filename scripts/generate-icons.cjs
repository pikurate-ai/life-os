const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { resolveBuildConfig } = require('./build-config.cjs');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="128" fill="#386750"/><g stroke="#f7f8ed" stroke-width="36" stroke-linecap="round"><path d="M256 128v256M128 256h256M165 165l182 182M165 347l182-182"/></g><circle cx="256" cy="256" r="44" fill="#386750"/><circle cx="256" cy="256" r="23" fill="#f7f8ed"/></svg>`;
(async () => {
  const publicDir = path.join(__dirname, '..', 'public');
  await fs.mkdir(path.join(publicDir, 'icons'), { recursive: true });
  for (const file of ['favicon.svg', 'icons/icon-192.svg', 'icons/icon-512.svg'])
    await fs.writeFile(path.join(publicDir, file), svg);
  await fs.writeFile(path.join(__dirname, '..', 'src', 'app', 'icon.svg'), svg);
  for (const [file, size] of [
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['apple-touch-icon.png', 180],
  ])
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, 'icons', file));
  const build = resolveBuildConfig();
  const base = build.scope;
  const manifest = {
    id: base,
    name: build.title,
    short_name: build.appName,
    description: '하루의 기록이 내일의 방향이 되도록.',
    lang: 'ko',
    start_url: base,
    scope: base,
    display: 'standalone',
    background_color: '#f6f7f5',
    theme_color: '#386750',
    icons: [
      { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      {
        src: `${base}icons/icon-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
  await fs.writeFile(
    path.join(publicDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log('Life OS icons and manifest generated.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
