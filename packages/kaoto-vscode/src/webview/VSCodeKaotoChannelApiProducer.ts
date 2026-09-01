import { BackendProxy } from '@kie-tools-core/backend/dist/api';
import { KogitoEditorChannelApi } from '@kie-tools-core/editor/dist/api';
import { I18n } from '@kie-tools-core/i18n/dist/core';
import { VsCodeKieEditorChannelApiProducer } from '@kie-tools-core/vscode-extension/dist/VsCodeKieEditorChannelApiProducer';
import { VsCodeKieEditorController } from '@kie-tools-core/vscode-extension/dist/VsCodeKieEditorController';
import { VsCodeI18n } from '@kie-tools-core/vscode-extension/dist/i18n';
import { JavaCodeCompletionApi } from '@kie-tools-core/vscode-java-code-completion/dist/api';
import { ResourceContentService } from '@kie-tools-core/workspace/dist/api';
import { VSCodeKaotoEditorChannelApi } from './VSCodeKaotoEditorChannelApi';
import { VsCodeWorkspaceChannelApiImpl } from '@kie-tools-core/vscode-extension/dist/workspace/VsCodeWorkspaceChannelApiImpl';
import { VsCodeNotificationsChannelApiImpl } from '@kie-tools-core/vscode-extension/dist/notifications/VsCodeNotificationsChannelApiImpl';

export class VSCodeKaotoChannelApiProducer implements VsCodeKieEditorChannelApiProducer {
	get(
		editor: VsCodeKieEditorController,
		resourceContentService: ResourceContentService,
		workspaceApi: VsCodeWorkspaceChannelApiImpl,
		backendProxy: BackendProxy,
		notificationsApi: VsCodeNotificationsChannelApiImpl,
		javaCodeCompletionApi: JavaCodeCompletionApi,
		viewType: string,
		i18n: I18n<VsCodeI18n>,
	): KogitoEditorChannelApi {
		return new VSCodeKaotoEditorChannelApi(
			editor,
			resourceContentService,
			workspaceApi,
			backendProxy,
			notificationsApi,
			javaCodeCompletionApi,
			viewType,
			i18n,
		);
	}
}
