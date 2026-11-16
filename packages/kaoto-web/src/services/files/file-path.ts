export type FilePathResult = { path: string } | { field: 'name' | 'folder'; error: string };

const INVALID_SEGMENTS = new Set(['.', '..']);

/**
 * Builds the path of a new file from its folder and name, appending the extension when the name lacks it.
 *
 * The folder is optional and normalized: surrounding slashes, repeated slashes and blanks around the segments are
 * dropped, since the Explorer derives the folders from the paths and would show folders with an empty name otherwise.
 */
export const buildFilePath = (folder: string, name: string, extension: string): FilePathResult => {
  const fileName = name.trim();
  if (!fileName) return { field: 'name', error: 'Enter a file name' };
  if (/[/\\]/.test(fileName)) return { field: 'name', error: 'Enter the folder in the folder field' };
  if (fileName === extension || INVALID_SEGMENTS.has(fileName)) return { field: 'name', error: 'Enter a file name' };

  const segments = folder
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.some((segment) => INVALID_SEGMENTS.has(segment) || segment.includes('\\'))) {
    return { field: 'folder', error: 'Use a folder path such as routes/orders' };
  }

  const fullName = fileName.endsWith(extension) ? fileName : `${fileName}${extension}`;
  return { path: [...segments, fullName].join('/') };
};

/**
 * The path of a file renamed to a new name in the same folder.
 *
 * The name is taken as typed, extension included, since renaming may change the type of the file.
 */
export const buildRenamedPath = (path: string, name: string): { path: string } | { error: string } => {
  const fileName = name.trim();
  if (!fileName || INVALID_SEGMENTS.has(fileName)) return { error: 'Enter a file name' };
  if (/[/\\]/.test(fileName)) return { error: 'A file name cannot contain / or \\' };

  const folder = path.slice(0, path.lastIndexOf('/') + 1);
  return { path: `${folder}${fileName}` };
};
