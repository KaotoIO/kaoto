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
 * Kaoto-owned replacement for @kie-tools-core/editor's EditorEnvelopeView.
 *
 * The upstream EditorEnvelopeView renders KIE's LoadingScreen and
 * KeyBindingsHelpOverlay, both of which import PatternFly stylesheets from
 * KIE's own PatternFly major. Owning this view keeps the webview bundle
 * PatternFly 6 only and makes @kie-tools-core/* version bumps safe regardless
 * of which PatternFly major KIE ships.
 *
 * Satisfies the EditorEnvelopeViewApi<E> imperative interface consumed by
 * KogitoEditorEnvelopeApiImpl.
 */
import { Editor } from '@kie-tools-core/editor/dist/api';
import { EditorEnvelopeViewApi } from '@kie-tools-core/editor/dist/envelope/EditorEnvelopeView';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { forwardRef, useImperativeHandle, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const KaotoEditorEnvelopeView = forwardRef<EditorEnvelopeViewApi<Editor>>(function KaotoEditorEnvelopeView(_props, ref) {
	const [editor, setEditor] = useState<Editor | undefined>(undefined);
	const [loading, setLoadingState] = useState(true);

	useImperativeHandle(
		ref,
		() => ({
			getEditor: () => editor,
			setEditor: (e: Editor) => setEditor(e),
			setLoading: () => setLoadingState(true),
			setLoadingFinished: () => setLoadingState(false),
			// setLocale is a no-op: Kaoto manages locale independently.
			// The upstream implementation only forwarded locale to LoadingScreen
			// and KeyBindingsHelpOverlay, neither of which exist here.
			setLocale: (_locale: string) => {
				/* no-op */
			},
		}),
		[editor],
	);

	return (
		<>
			{loading && (
				<Bullseye style={{ position: 'absolute', width: '100vw', height: '100vh' }}>
					<Spinner aria-label="Loading Kaoto editor" />
				</Bullseye>
			)}
			<div style={{ position: 'absolute', width: '100vw', height: '100vh', top: 0, left: 0 }}>
				{}
				{editor && editor.af_isReact && (editor.af_componentRoot() as any)}
			</div>
		</>
	);
});
