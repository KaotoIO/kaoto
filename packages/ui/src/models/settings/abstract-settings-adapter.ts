import { SettingsModel } from './settings.model';

export abstract class AbstractSettingsAdapter {
  abstract getSettings(): SettingsModel;
  abstract saveSettings(settings: SettingsModel): void;
}
