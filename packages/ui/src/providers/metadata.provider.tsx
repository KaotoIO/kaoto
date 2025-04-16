import { FunctionComponent, PropsWithChildren, createContext } from 'react';

export interface IMetadataApi {
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
   * Delete resource
   * @param path The path of the resource
   */
  deleteResource(path: string): Promise<boolean>;

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

  /**
   * A flag indicates that if the schema file needs to be saved or not. If it's running inside the VS Code,
   * the schema file is supposed to be read from existing workspace file, therefore it should not save it and overwrite.
   * On the other hand, if it's running in the browser, the schema file is uploaded directly from the browser, therefore
   * it needs to be saved to some store.
   * TODO The file saving in the browser is not implemented yet. If we implement the browser side to be same as what's done
   *      in VS Code, i.e. expecting schema files already in some store and just pick from there, we can remove this.
   */
  shouldSaveSchema: boolean;
}

export const MetadataContext = createContext<IMetadataApi | undefined>(undefined);

/**
 * The goal for this provider is to expose a settings adapter to the SettingsForm component
 * and its children, so they can be used to render the form fields.
 * In addition to that, it also provides a mechanism to read/write the settings values.
 */
export const MetadataProvider: FunctionComponent<PropsWithChildren<{ api: IMetadataApi }>> = ({ api, children }) => {
  return <MetadataContext.Provider value={api}>{children}</MetadataContext.Provider>;
};
