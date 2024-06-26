import { KogitoEditorChannelApi } from '@kie-tools-core/editor/dist/api';

export interface KaotoEditorChannelApi extends KogitoEditorChannelApi {
  getCatalogURL(): Promise<string | undefined>;
}
