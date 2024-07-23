import {
  Editor,
  EditorFactory,
  EditorInitArgs,
  KogitoEditorEnvelopeContextType,
} from '@kie-tools-core/editor/dist/api';
import { DefaultSettingsAdapter } from '../models';
import { CatalogSchemaLoader, isDefined } from '../utils';
import { KaotoEditorApp } from './KaotoEditorApp';
import { KaotoEditorChannelApi } from './KaotoEditorChannelApi';

export class KaotoEditorFactory implements EditorFactory<Editor, KaotoEditorChannelApi> {
  public async createEditor(
    envelopeContext: KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>,
    initArgs: EditorInitArgs,
  ): Promise<Editor> {
    const settings = await envelopeContext.channelApi.requests.getVSCodeKaotoSettings();
    const settingsAdapter = new DefaultSettingsAdapter(settings);
    this.updateCatalogUrl(settingsAdapter, initArgs);

    return Promise.resolve(new KaotoEditorApp(envelopeContext, initArgs, settingsAdapter));
  }

  /**
   * Updates the catalog URL in the settings if it is not defined, to include the embedded catalog.
   * It uses the resourcesPathPrefix from the initArgs to build the default catalog URL.
   *
   * @param settingsAdapter The settings adapter to update the catalog URL
   * @param initArgs        The init args to get the resources path prefix
   */
  private updateCatalogUrl(settingsAdapter: DefaultSettingsAdapter, initArgs: EditorInitArgs) {
    let catalogUrl = settingsAdapter.getSettings().catalogUrl;

    if (!isDefined(catalogUrl) || catalogUrl === '') {
      catalogUrl = `${initArgs.resourcesPathPrefix}${CatalogSchemaLoader.DEFAULT_CATALOG_PATH.replace('.', '')}`;
      settingsAdapter.saveSettings({ ...settingsAdapter.getSettings(), catalogUrl });
    }
  }
}
