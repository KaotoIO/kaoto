/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * This class is a copy of https://github.com/apache/incubator-kie-tools/blob/main/packages/editor/src/envelope/KogitoEditorEnvelope.tsx
 * meant to override how React apps are bootstrapped.
 */
import { Editor, KogitoEditorChannelApi, KogitoEditorEnvelopeApi, KogitoEditorEnvelopeContextType } from '@kie-tools-core/editor/dist/api';
import { EditorEnvelopeViewApi } from '@kie-tools-core/editor/dist/envelope';
import { Envelope, EnvelopeApiFactory } from '@kie-tools-core/envelope';
import { ApiDefinition } from '@kie-tools-core/envelope-bus/dist/api';
import { I18nService } from '@kie-tools-core/i18n/dist/envelope';
import { KeyboardShortcutsService } from '@kie-tools-core/keyboard-shortcuts/dist/envelope/KeyboardShortcutsService';
import { getOperatingSystem } from '@kie-tools-core/operating-system';
import { RefObject } from 'react';
import { createRoot } from 'react-dom/client';
import { KogitoEditorEnvelopeApp } from './KogitoEditorEnvelopeApp';

export class KogitoEditorEnvelope<
	E extends Editor,
	EnvelopeApi extends KogitoEditorEnvelopeApi & ApiDefinition<EnvelopeApi>,
	ChannelApi extends KogitoEditorChannelApi & ApiDefinition<ChannelApi>,
> {
	constructor(
		private readonly kogitoEditorEnvelopeApiFactory: EnvelopeApiFactory<
			EnvelopeApi,
			ChannelApi,
			EditorEnvelopeViewApi<E>,
			KogitoEditorEnvelopeContextType<ChannelApi>
		>,
		private readonly keyboardShortcutsService: KeyboardShortcutsService,
		i18nService: I18nService,
		private readonly envelope: Envelope<EnvelopeApi, ChannelApi, EditorEnvelopeViewApi<E>, KogitoEditorEnvelopeContextType<ChannelApi>>,
		private readonly context: KogitoEditorEnvelopeContextType<ChannelApi> = {
			channelApi: envelope.channelApi,
			operatingSystem: getOperatingSystem(),
			services: {
				keyboardShortcuts: keyboardShortcutsService,
				i18n: i18nService,
			},
			supportedThemes: [],
		},
	) {}

	public start(container: HTMLElement) {
		return this.envelope.start(() => this.renderView(container), this.context, this.kogitoEditorEnvelopeApiFactory);
	}

	private renderView(container: HTMLElement): Promise<() => EditorEnvelopeViewApi<E>> {
		return new Promise<() => EditorEnvelopeViewApi<E>>((resolve) => {
			const callback = (ref: RefObject<EditorEnvelopeViewApi<Editor> | null>) => {
				resolve(() => ref.current! as unknown as EditorEnvelopeViewApi<E>);
			};

			setTimeout(() => {
				const root = createRoot(container);
				root.render(
					<KogitoEditorEnvelopeApp callback={callback} context={this.context} showKeyBindingsOverlay={this.keyboardShortcutsService.isEnabled()} />,
				);
			}, 0);
		});
	}
}
