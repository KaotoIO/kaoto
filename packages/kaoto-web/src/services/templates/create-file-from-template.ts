import { NewFile, StoredFile } from '../files/stored-file';
import { fetchStarterTemplate, resolveStarterTemplate, StarterTemplateName } from './starter-templates';

interface CreateFileFromTemplate {
  /** The index of the catalog that has the starter templates */
  catalogUrl: string;
  template: StarterTemplateName;
  /** The path of the new file; its last segment is the file name the template is filled in for */
  path: string;
  /** Stores the file, e.g. `createFile` of the files context */
  createFile: (file: NewFile) => Promise<StoredFile>;
  /** Aborted to cancel: a file that is not stored yet is not created */
  signal?: AbortSignal;
}

/**
 * Creates a file from a starter template of the catalog: loads the template, fills it in for the file name and stores
 * the file.
 *
 * @returns the stored file, or `undefined` when it was cancelled while the template was loading
 */
export const createFileFromTemplate = async ({
  catalogUrl,
  template,
  path,
  createFile,
  signal,
}: CreateFileFromTemplate): Promise<StoredFile | undefined> => {
  const loaded = await fetchStarterTemplate(catalogUrl, template);
  if (signal?.aborted) return undefined;

  const fileName = path.slice(path.lastIndexOf('/') + 1);
  return createFile({ path, content: resolveStarterTemplate(loaded, fileName) });
};
