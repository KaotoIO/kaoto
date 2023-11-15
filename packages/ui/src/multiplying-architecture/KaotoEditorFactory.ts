import { KaotoEditorView } from './KaotoEditorApp';
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
    return Promise.resolve(new KaotoEditorView(envelopeContext, initArgs));
  }
}
