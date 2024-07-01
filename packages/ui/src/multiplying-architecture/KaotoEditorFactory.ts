import { KaotoEditorApp } from './KaotoEditorApp';
import {
  Editor,
  EditorFactory,
  EditorInitArgs,
  KogitoEditorEnvelopeContextType,
} from '@kie-tools-core/editor/dist/api';
import { KaotoEditorChannelApi } from './KaotoEditorChannelApi';
import { CatalogSchemaLoader, isDefined } from '../utils';
import { LocalStorageSettingsAdapter } from '../models/settings/localstorage-settings-adapter';

export class KaotoEditorFactory implements EditorFactory<Editor, KaotoEditorChannelApi> {
  public async createEditor(
    envelopeContext: KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>,
    initArgs: EditorInitArgs,
  ): Promise<Editor> {
    let catalogUrl;
    const catalogUrlFromChannelApi = await envelopeContext.channelApi.requests.getCatalogURL();
    if (isDefined(catalogUrlFromChannelApi)) {
      catalogUrl = catalogUrlFromChannelApi;
    } else {
      catalogUrl = `${initArgs.resourcesPathPrefix}${CatalogSchemaLoader.DEFAULT_CATALOG_PATH.replace('.', '')}`;
    }
    const settingsAdapter = new LocalStorageSettingsAdapter();
    const settingsModel = settingsAdapter.getSettings();
    settingsModel.catalogUrl = catalogUrl;
    settingsAdapter.saveSettings(settingsModel);
    return Promise.resolve(new KaotoEditorApp(envelopeContext, initArgs, catalogUrl));
  }
}
