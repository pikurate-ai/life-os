const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const previewEnv = {
  ...process.env,
  GITHUB_PAGES: 'true',
  LIFE_OS_BASE_PATH: '/life-os-preview',
  LIFE_OS_PREVIEW: 'false',
};
for (const args of [
  [path.join(__dirname, 'generate-icons.cjs')],
  [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'build'],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: previewEnv,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
