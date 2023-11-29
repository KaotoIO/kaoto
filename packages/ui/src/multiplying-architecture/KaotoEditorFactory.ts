import { KaotoEditorApp } from './KaotoEditorApp';
import {
  Editor,
  EditorFactory,
  EditorInitArgs,
  KogitoEditorEnvelopeContextType,
  KogitoEditorChannelApi,
} from '@kie-tools-core/editor/dist/api';

export class KaotoEditorFactory implements EditorFactory<Editor, KogitoEditorChannelApi> {
  public createEditor(
    envelopeContext: KogitoEditorEnvelopeContextType<KogitoEditorChannelApi>,
    initArgs: EditorInitArgs,
  ): Promise<Editor> {
    return Promise.resolve(new KaotoEditorApp(envelopeContext, initArgs));
  }
}
