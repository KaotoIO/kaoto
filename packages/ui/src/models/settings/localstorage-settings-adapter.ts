import { isTestRuntime } from '../../utils/catalog-helper';
import { LocalStorageKeys } from '../local-storage-keys';
import { AbstractSettingsAdapter, CanvasLayoutDirection, ISettingsModel, SettingsModel } from './settings.model';

export class LocalStorageSettingsAdapter implements AbstractSettingsAdapter {
  private migrated = false;

  constructor() {
    // Run migration once on first instantiation
    this.runMigration();
  }

  private runMigration(): void {
    if (this.migrated) return;

    try {
      const oldCatalog = localStorage.getItem(LocalStorageKeys.SelectedCatalog);
      if (oldCatalog && oldCatalog !== 'undefined') {
        const parsed = JSON.parse(oldCatalog);
        if (parsed?.version && parsed.runtime) {
          const catalogVersion = {
            version: parsed.version,
            runtime: parsed.runtime,
          };

          const rawSettings = localStorage.getItem(LocalStorageKeys.Settings) ?? '{}';
          const parsedSettings: Partial<ISettingsModel> = JSON.parse(rawSettings);

          if (isTestRuntime(parsed.runtime) && !parsedSettings.citrusCatalog) {
            parsedSettings.citrusCatalog = catalogVersion;
          } else if (!isTestRuntime(parsed.runtime) && !parsedSettings.camelCatalog) {
            parsedSettings.camelCatalog = catalogVersion;
          }

          localStorage.setItem(LocalStorageKeys.Settings, JSON.stringify(parsedSettings));
          localStorage.removeItem(LocalStorageKeys.SelectedCatalog);
        }
      }
    } catch {
      // Silently ignore migration errors - app will use defaults
    }

    this.migrated = true;
  }

  getSettings(): ISettingsModel {
    // Always read fresh from localStorage to ensure we get the latest saved values
    const rawSettings = localStorage.getItem(LocalStorageKeys.Settings) ?? '{}';
    const parsedSettings: Partial<ISettingsModel> = JSON.parse(rawSettings);

    parsedSettings.rest ??= {
      apicurioRegistryUrl: '',
      customMediaTypes: [],
    };

    parsedSettings.canvasLayoutDirection ??= CanvasLayoutDirection.SelectInCanvas;

    return new SettingsModel(parsedSettings);
  }

  saveSettings(settings: ISettingsModel): void {
    localStorage.setItem(LocalStorageKeys.Settings, JSON.stringify(settings));
  }
}
