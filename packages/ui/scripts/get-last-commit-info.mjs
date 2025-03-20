// @ts-check
import simpleGit from 'simple-git';

/**
 * Get the git last commit info
 *
 * @returns {Promise<import('simple-git').DefaultLogFields>} The last commit info
 */
export async function getLastCommitInfo() {
  return new Promise((resolve, reject) => {
    simpleGit().log({ n: 1 }, (err, status) => {
      if (err || !status.latest || status.latest === null) {
        reject(err);
      } else {
        resolve(status.latest);
      }
    });
  });
}
