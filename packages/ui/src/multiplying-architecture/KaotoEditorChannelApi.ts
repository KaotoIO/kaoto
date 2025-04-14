import { KogitoEditorChannelApi } from '@kie-tools-core/editor/dist/api';
import { ISettingsModel } from '../models/settings';

export interface KaotoEditorChannelApi extends KogitoEditorChannelApi {
  /**
   * Save the current file
   */
  saveFile(): Promise<void>;

  /**
   * @deprecated Use `getVSCodeKaotoSettings().catalogUrl` instead
   * Returns the URL of the catalog.
   */
  getCatalogURL(): Promise<string | undefined>;

  /**
   * Returns the Kaoto VSCode settings defined.
   */
  getVSCodeKaotoSettings(): Promise<ISettingsModel>;

  /**
   * Get metadata querying a Kaoto metadata file.
   * @param key The key to retrieve the metadata from the Kaoto metadata file
   */
  getMetadata<T>(key: string): Promise<T | undefined>;

  /**
   * Save metadata to a Kaoto metadata file.
   * @param key The key to set the metadata
   * @param metadata The metadata to be saved
   */
  setMetadata<T>(key: string, metadata: T): Promise<void>;

  /**
   * Retrieve resource content
   * @param path The path of the resource relatively to the currently edited Camel file
   */
  getResourceContent(path: string): Promise<string | undefined>;

  /**
   * Save resource content
   * @param path The path of the resource relatively to the currently edited Camel file
   * @param content The content to be saved
   */
  saveResourceContent(path: string, content: string): Promise<void>;

  /**
   * Delete resource
   * @param path The path of the resource relatively to the currently edited Camel file
   * @return If the deletion was done succesfully
   */
  deleteResource(path: string): Promise<boolean>;

  /**
   * Show a file picker and ask the user to select one or more files available.
   * @param include The filter expression for the files to include
   * @param exclude The filter expression for the files to exclude
   * @param options The options to pass over. In VS Code, it is directly delivered as QuickPickOptions
   */
  askUserForFileSelection(
    include: string,
    exclude?: string,
    options?: Record<string, unknown>,
  ): Promise<string[] | string | undefined>;
}
