/** The error for a name that a file or folder in the same folder already has */
export const TAKEN = 'A file or folder with that name already exists';

/** Every path a file or folder cannot take: the paths of the entries and of the folders above them */
export const takenPaths = (entries: { path: string }[]): Set<string> => {
  const taken = new Set<string>();
  for (const { path } of entries) {
    taken.add(path);
    for (let slash = path.indexOf('/'); slash !== -1; slash = path.indexOf('/', slash + 1)) {
      taken.add(path.slice(0, slash));
    }
  }
  return taken;
};
