// @ts-check
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'module';
const packageJson = createRequire(import.meta.url)('../package.json');
const versionJson = createRequire(import.meta.url)('../src/version.json');

const main = async () => {
  const { getLastCommitInfo } = await import('./get-last-commit-info.mjs');
  const gitInfo = await getLastCommitInfo();

  /**
   * This object is used to write the version.json file
   * It should be kept in sync with the version.json schema,
   * hence the use of `typeof versionJson`.
   * @type {typeof versionJson}
   */
  const VERSION_OBJECT = {
    GIT_HASH: gitInfo.hash,
    GIT_DATE: gitInfo.date,
    KAOTO_VERSION: packageJson.version,
  };

  const VERSION_FILE_CONTENT = JSON.stringify(VERSION_OBJECT, null, 4);

  /** Write the VERSION_FILE_CONTENT into the `lib/XXX/version.json file */
  await writeFile('lib/esm/version.json', VERSION_FILE_CONTENT);
  await writeFile('lib/cjs/version.json', VERSION_FILE_CONTENT);
};

main();
