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
import { EditorEnvelopeViewApi } from '@kie-tools-core/editor/dist/envelope/EditorEnvelopeView';
import { createRef, FunctionComponent, RefObject, useCallback } from 'react';
import { KaotoEditorEnvelopeView } from './KaotoEditorEnvelopeView';

interface KogitoEditorEnvelopeAppProps {
	callback: (ref: RefObject<EditorEnvelopeViewApi<Editor> | null>) => void;

	context: KogitoEditorEnvelopeContextType<any, any>;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const KogitoEditorEnvelopeApp: FunctionComponent<KogitoEditorEnvelopeAppProps> = ({ callback, context }: KogitoEditorEnvelopeAppProps) => {
	const editorEnvelopeViewRef = createRef<EditorEnvelopeViewApi<Editor>>();

	const onMountFn = useCallback(() => {
		callback(editorEnvelopeViewRef);
	}, []);

	return (
		<div ref={onMountFn}>
			<KogitoEditorEnvelopeContext.Provider value={context}>
				<KaotoEditorEnvelopeView ref={editorEnvelopeViewRef} />
			</KogitoEditorEnvelopeContext.Provider>
		</div>
	);
};
