import version from './version.json';

let GIT_HASH = version.GIT_HASH;
let GIT_DATE = version.GIT_DATE;
let KAOTO_VERSION = version.KAOTO_VERSION;

try {
  /**
   * Values defined during the web application build time
   * @see vite.config.js
   */
  GIT_HASH = __GIT_HASH;
  GIT_DATE = __GIT_DATE;
  KAOTO_VERSION = __KAOTO_VERSION;
} catch (error) {
  // Ignore
}

export { GIT_DATE, GIT_HASH, KAOTO_VERSION };
