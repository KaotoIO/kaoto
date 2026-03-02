import version from './version.json';

/**
 * The ones start with `__` are the values defined during the web application build time
 * @see vite.config.js
 */
export const GIT_HASH = (() => {
  try {
    return __GIT_HASH;
  } catch {
    return version.GIT_HASH;
  }
})();

export const GIT_DATE = (() => {
  try {
    return __GIT_DATE;
  } catch {
    return version.GIT_DATE;
  }
})();

export const KAOTO_VERSION = (() => {
  try {
    return __KAOTO_VERSION;
  } catch {
    return version.KAOTO_VERSION;
  }
})();
