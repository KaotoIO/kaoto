import { KogitoEditorChannelApi } from '@kie-tools-core/editor/dist/api';
import { ISettingsModel } from '../models/settings';

export interface KaotoEditorChannelApi extends KogitoEditorChannelApi {
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
   * @param path The path of the resource
   */
  getResourceContent(path: string): Promise<string | undefined>;

  /**
   * Save resource content
   * @param path The path of the resource
   * @param content The content to be saved
   */
  saveResourceContent(path: string, content: string): Promise<void>;

  /**
   * Show a Quick Pick widget and ask the user to select one or more files available in the workspace.
   * @param include The filter expression for the files to include
   * @param exclude The filter expression for the files to exclude
   * @param options The options to pass over to VSCode QuickPick
   */
  askUserForFileSelection(
    include: string,
    exclude?: string,
    options?: Record<string, unknown>,
  ): Promise<string[] | string | undefined>;
}
