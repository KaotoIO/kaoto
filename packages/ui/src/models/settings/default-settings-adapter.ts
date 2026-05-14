import { resolveSettingsForCatalogUrl } from '../../utils/catalog-helper';
import { AbstractSettingsAdapter, ISettingsModel, SettingsModel } from './settings.model';

export class DefaultSettingsAdapter implements AbstractSettingsAdapter {
  private settings: ISettingsModel;

  constructor(settings?: Partial<ISettingsModel>) {
    this.settings = new SettingsModel(settings);
  }

  getSettings() {
    return this.settings;
  }

  async saveSettings(settings: ISettingsModel) {
    const resolvedSettings = await resolveSettingsForCatalogUrl(settings);
    Object.assign(this.settings, resolvedSettings);
  }
}
