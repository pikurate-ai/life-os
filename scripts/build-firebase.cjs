const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadEnvConfig } = require('@next/env');

const root = path.resolve(__dirname, '..');
loadEnvConfig(root);
const project = 'life-os-563cd';
if (
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== project ||
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN !== `${project}.firebaseapp.com` ||
  ['API_KEY', 'APP_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID'].some(
    (key) => !process.env[`NEXT_PUBLIC_FIREBASE_${key}`],
  )
) {
  throw new Error('Firebase Hosting build requires the complete Life OS project configuration.');
}
const hostingEnv = {
  ...process.env,
  GITHUB_PAGES: 'false',
  LIFE_OS_BASE_PATH: '',
  LIFE_OS_PREVIEW: 'false',
};
for (const args of [
  [path.join(__dirname, 'generate-icons.cjs')],
  [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'build'],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: hostingEnv,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
