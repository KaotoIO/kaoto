/** The error for a name that a file or folder in the same folder already has */
export const TAKEN = 'A file or folder with that name already exists';

/** Every path a file or folder cannot take: the files, the folders of their paths and the stored folders */
export const takenPaths = (files: { path: string }[], folders: string[]): Set<string> => {
  const taken = new Set(folders);
  for (const { path } of files) {
    taken.add(path);
    for (let slash = path.indexOf('/'); slash !== -1; slash = path.indexOf('/', slash + 1)) {
      taken.add(path.slice(0, slash));
    }
  }
  return taken;
};
