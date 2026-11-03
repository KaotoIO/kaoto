import { KogitoEditorChannelApi } from '@kie-tools-core/editor/dist/api';
import { VsCodeKieEditorChannelApiProducer } from '@kie-tools-core/vscode-extension/dist/VsCodeKieEditorChannelApiProducer';
import { VSCodeKaotoEditorChannelApi } from './VSCodeKaotoEditorChannelApi';

export class VSCodeKaotoChannelApiProducer implements VsCodeKieEditorChannelApiProducer {
	get(...args: Parameters<VsCodeKieEditorChannelApiProducer['get']>): KogitoEditorChannelApi {
		return new VSCodeKaotoEditorChannelApi(...args);
	}
}
