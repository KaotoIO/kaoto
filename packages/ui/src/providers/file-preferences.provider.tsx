import { FunctionComponent, PropsWithChildren, createContext } from 'react';

export interface IFilePreferencesApi {
  /**
   * Get FilePreferences by a given key
   * @param key The key to retrieve the FilePreferences
   * @returns The FilePreferences
   */
  getFilePreferences: <T>(key: string) => Promise<T>;

  /**
   * Set FilePreferences by a given key
   * @param key The key to set the FilePreferences
   */
  setFilePreferences: <T>(key: string, preferences: T) => Promise<void>;
}

export const FilePreferences = createContext<IFilePreferencesApi | undefined>(undefined);

/**
 * The goal for this provider is to expose a settings adapter to the SettingsForm component
 * and its children, so they can be used to render the form fields.
 * In addition to that, it also provides a mechanism to read/write the settings values.
 */
export const FilePreferencesProvider: FunctionComponent<PropsWithChildren<{ api: IFilePreferencesApi }>> = ({
  api,
  children,
}) => {
  return <FilePreferences.Provider value={api}>{children}</FilePreferences.Provider>;
};
