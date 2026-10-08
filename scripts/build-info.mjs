// @ts-check
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { simpleGit } from 'simple-git';

/**
 * @typedef {object} BuildInfo
 * @property {string} GIT_HASH Hash of the last commit
 * @property {string} GIT_DATE Author date of the last commit, in strict ISO 8601
 * @property {string} KAOTO_VERSION Kaoto release version
 */

/** The release pipeline writes the same version to every workspace, root included */
const ROOT_PACKAGE_JSON_PATH = resolve(import.meta.dirname, '../package.json');

/**
 * Get the git last commit info, or empty values when git is unavailable (e.g. building from a source tarball)
 *
 * @returns {Promise<{ hash: string; date: string }>}
 */
async function getLastCommitInfo() {
  try {
    const { latest } = await simpleGit().log({ n: 1, format: { hash: '%H', date: '%aI' } });
    if (latest) {
      return latest;
    }
    console.warn('[build-info] No commits found, falling back to empty git info');
  } catch (error) {
    console.warn('[build-info] Unable to read git info, falling back to empty values:', error);
  }

  return { hash: '', date: '' };
}

/**
 * Get the build metadata displayed in the About modal
 *
 * @returns {Promise<BuildInfo>}
 */
export async function getBuildInfo() {
  const [lastCommitInfo, packageJson] = await Promise.all([
    getLastCommitInfo(),
    readFile(ROOT_PACKAGE_JSON_PATH, 'utf-8').then((content) => JSON.parse(content)),
  ]);

  return {
    GIT_HASH: lastCommitInfo.hash,
    GIT_DATE: lastCommitInfo.date,
    KAOTO_VERSION: packageJson.version,
  };
}

/**
 * Get the build metadata as compile-time constants, ready for vite `define` or webpack `DefinePlugin`
 *
 * @see packages/ui/src/version.ts
 * @returns {Promise<Record<`__${keyof BuildInfo}`, string>>}
 */
export async function getBuildInfoDefines() {
  const { GIT_HASH, GIT_DATE, KAOTO_VERSION } = await getBuildInfo();

  return {
    __GIT_HASH: JSON.stringify(GIT_HASH),
    __GIT_DATE: JSON.stringify(GIT_DATE),
    __KAOTO_VERSION: JSON.stringify(KAOTO_VERSION),
  };
}
