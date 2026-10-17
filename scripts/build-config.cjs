/** One path contract for Next.js, metadata, PNG icons and the install manifest. */
function resolveBuildConfig(env = process.env) {
  const requested = env.LIFE_OS_BASE_PATH ?? (env.GITHUB_PAGES === 'true' ? '/life-os' : '');
  const basePath = requested.replace(/\/+$/, '');
  if (basePath && (!/^\/[A-Za-z0-9/_-]+$/.test(basePath) || basePath.includes('//'))) {
    throw new Error('LIFE_OS_BASE_PATH must be an absolute URL path such as /life-os-preview.');
  }
  const preview = env.LIFE_OS_PREVIEW === 'true';
  return {
    basePath,
    scope: `${basePath}/`,
    preview,
    appName: preview ? 'Life OS 테스트' : 'Life OS',
    title: preview ? 'Life OS 테스트 — iPhone 미리보기' : 'Life OS — 나를 위한 일상의 공간',
  };
}
module.exports = { resolveBuildConfig };
