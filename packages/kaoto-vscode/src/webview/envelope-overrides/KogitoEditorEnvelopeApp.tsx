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
import { Editor, KogitoEditorEnvelopeContext, KogitoEditorEnvelopeContextType } from '@kie-tools-core/editor/dist/api';
import { EditorEnvelopeView, EditorEnvelopeViewApi } from '@kie-tools-core/editor/dist/envelope/EditorEnvelopeView';
import { EditorEnvelopeI18nContext, editorEnvelopeI18nDefaults, editorEnvelopeI18nDictionaries } from '@kie-tools-core/editor/dist/envelope/i18n';
import { I18nDictionariesProvider } from '@kie-tools-core/i18n/dist/react-components';
import { createRef, FunctionComponent, RefObject, useCallback } from 'react';

interface KogitoEditorEnvelopeAppProps {
	callback: (ref: RefObject<EditorEnvelopeViewApi<Editor> | null>) => void;
	context: KogitoEditorEnvelopeContextType<any>;
	showKeyBindingsOverlay: boolean;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const KogitoEditorEnvelopeApp: FunctionComponent<KogitoEditorEnvelopeAppProps> = ({
	callback,
	context,
	showKeyBindingsOverlay,
}: KogitoEditorEnvelopeAppProps) => {
	const editorEnvelopeViewRef = createRef<EditorEnvelopeViewApi<Editor>>();

	const onMountFn = useCallback(() => {
		callback(editorEnvelopeViewRef);
	}, []);

	return (
		<div ref={onMountFn}>
			<KogitoEditorEnvelopeContext.Provider value={context}>
				<I18nDictionariesProvider
					defaults={editorEnvelopeI18nDefaults}
					dictionaries={editorEnvelopeI18nDictionaries}
					ctx={EditorEnvelopeI18nContext}
					initialLocale={navigator.language}
				>
					<EditorEnvelopeI18nContext.Consumer>
						{({ setLocale }) => (
							<EditorEnvelopeView ref={editorEnvelopeViewRef} setLocale={setLocale} showKeyBindingsOverlay={showKeyBindingsOverlay} />
						)}
					</EditorEnvelopeI18nContext.Consumer>
				</I18nDictionariesProvider>
			</KogitoEditorEnvelopeContext.Provider>
		</div>
	);
};
