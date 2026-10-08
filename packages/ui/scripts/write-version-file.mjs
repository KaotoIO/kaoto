// @ts-check
import { writeFile } from 'node:fs/promises';

import { getBuildInfo } from '../../../scripts/build-info.mjs';

/**
 * The published library can't rely on compile-time constants, so `src/version.ts` falls back to `lib/version.json`
 * @type {typeof import('../src/version.json')}
 */
const VERSION_OBJECT = await getBuildInfo();

await writeFile('lib/version.json', JSON.stringify(VERSION_OBJECT, null, 4));
