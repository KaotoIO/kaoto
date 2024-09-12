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
   * Returns preferences querying the Kaoto preferences file.
   */
  getFilePreferences<T>(key: string): Promise<T>;

  /**
   * Save preferences to the Kaoto preferences file.
   */
  setFilePreferences<T>(key: string, preferences: T): Promise<void>;
}
