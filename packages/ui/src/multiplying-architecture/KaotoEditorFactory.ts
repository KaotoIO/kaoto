import { KaotoEditorApp } from './KaotoEditorApp';
import {
  Editor,
  EditorFactory,
  EditorInitArgs,
  KogitoEditorEnvelopeContextType,
} from '@kie-tools-core/editor/dist/api';
import { KaotoEditorChannelApi } from './KaotoEditorChannelApi';
import { CatalogSchemaLoader, isDefined } from '../utils';

export class KaotoEditorFactory implements EditorFactory<Editor, KaotoEditorChannelApi> {
  public async createEditor(
    envelopeContext: KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>,
    initArgs: EditorInitArgs,
  ): Promise<Editor> {
    let catalogUrl = await envelopeContext.channelApi.requests.getCatalogURL();

    if (!isDefined(catalogUrl) || catalogUrl === '') {
      catalogUrl = `${initArgs.resourcesPathPrefix}${CatalogSchemaLoader.DEFAULT_CATALOG_PATH.replace('.', '')}`;
    }

    return Promise.resolve(new KaotoEditorApp(envelopeContext, initArgs, catalogUrl));
  }
}
