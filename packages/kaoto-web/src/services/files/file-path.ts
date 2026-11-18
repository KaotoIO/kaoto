export type FilePathResult = { path: string } | { field: 'name' | 'folder'; error: string };

const INVALID_SEGMENTS = new Set(['.', '..']);
const NAME_REQUIRED = 'Enter a file name';
const SEPARATOR = /[/\\]/;

/** Trims the name and rejects what cannot be a single path segment, with the errors of the caller */
const checkName = (
  name: string,
  requiredError: string,
  separatorError: string,
): { trimmedName: string } | { error: string } => {
  const trimmedName = name.trim();
  if (!trimmedName || INVALID_SEGMENTS.has(trimmedName)) return { error: requiredError };
  if (SEPARATOR.test(trimmedName)) return { error: separatorError };
  return { trimmedName };
};

/**
 * Builds the path of a new file from its folder and name, appending the extension when the name lacks it.
 *
 * The folder is optional and normalized: surrounding slashes, repeated slashes and blanks around the segments are
 * dropped, since the Explorer derives the folders from the paths and would show folders with an empty name otherwise.
 */
export const buildFilePath = (folder: string, name: string, extension: string): FilePathResult => {
  const checked = checkName(name, NAME_REQUIRED, 'Enter the folder in the folder field');
  if ('error' in checked) return { field: 'name', error: checked.error };
  const fileName = checked.trimmedName;
  if (fileName === extension) return { field: 'name', error: NAME_REQUIRED };

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
 * The path of a new file or folder named `name` in the folder.
 *
 * @param folderPath `/`-separated, empty for the root
 */
export const buildChildPath = (
  folderPath: string,
  name: string,
  kind: 'file' | 'folder',
): { path: string } | { error: string } => {
  const checked = checkName(name, `Enter a ${kind} name`, `A ${kind} name cannot contain / or \\`);
  if ('error' in checked) return checked;

  return { path: folderPath ? `${folderPath}/${checked.trimmedName}` : checked.trimmedName };
};

/**
 * The path of a file renamed to a new name in the same folder.
 *
 * The name is taken as typed, extension included, since renaming may change the type of the file.
 */
export const buildRenamedPath = (path: string, name: string): { path: string } | { error: string } =>
  buildChildPath(path.slice(0, Math.max(path.lastIndexOf('/'), 0)), name, 'file');
