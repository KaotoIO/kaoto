/**
 * Compare the version of camel catalogs
 *
 * @param v1 The first version.
 * @param v2 The second version.
 * @returns -1 if v1 is greater, 1 if v2 is greater, 0 if they are equal.
 */
export const versionCompare = (v1: string, v2: string): number => {
  // vnum stores each numeric
  // part of version
  let vnum1 = 0,
    vnum2 = 0;

  // loop until both string are processed
  for (let i = 0, j = 0; i < v1.length || j < v2.length; ) {
    // storing numeric part of version 1 in vnum1
    while (i < v1.length && v1[i] != '.') {
      vnum1 = vnum1 * 10 + Number(v1[i]);
      i++;
    }

    // storing numeric part of version 2 in vnum2
    while (j < v2.length && v2[j] != '.') {
      vnum2 = vnum2 * 10 + Number(v2[j]);
      j++;
    }

    if (vnum1 > vnum2) return -1;
    if (vnum2 > vnum1) return 1;

    // if equal, reset variables and go for next numeric part
    vnum1 = vnum2 = 0;
    i++;
    j++;
  }
  return 0;
};
