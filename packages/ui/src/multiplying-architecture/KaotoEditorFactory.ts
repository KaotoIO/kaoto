import {
  Editor,
  EditorFactory,
  EditorInitArgs,
  KogitoEditorEnvelopeContextType,
} from '@kie-tools-core/editor/dist/api';

import { DefaultSettingsAdapter, ISettingsModel, SettingsModel } from '../models';
import { CatalogSchemaLoader, isDefined, promiseTimeout } from '../utils';
import { KaotoEditorApp } from './KaotoEditorApp';
import { KaotoEditorChannelApi } from './KaotoEditorChannelApi';

export class KaotoEditorFactory implements EditorFactory<Editor, KaotoEditorChannelApi> {
  public async createEditor(
    envelopeContext: KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>,
    initArgs: EditorInitArgs,
  ): Promise<Editor> {
    const settings = await this.getSettings(envelopeContext);

    const settingsAdapter = new DefaultSettingsAdapter(settings);
    this.updateCatalogUrl(settingsAdapter, initArgs);

    return Promise.resolve(new KaotoEditorApp(envelopeContext, initArgs, settingsAdapter));
  }

  /**
   * Get the settings from the envelope context
   */
  private async getSettings(
    envelopeContext: KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>,
  ): Promise<ISettingsModel> {
    let settings: ISettingsModel;

    try {
      /**
       * For non-implemented API methods, the promises won't resolve, for that reason
       * we use a timeout to reject the promise and fallback to the previous API
       */
      settings = await promiseTimeout(envelopeContext.channelApi.requests.getVSCodeKaotoSettings(), 500);
    } catch (error) {
      /**
       * Reaching this point means that the new API is not available yet,
       * so we fallback to the previous API
       */
      const catalogUrl = await envelopeContext.channelApi.requests.getCatalogURL();
      settings = new SettingsModel({ catalogUrl });
    }

    return settings;
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
