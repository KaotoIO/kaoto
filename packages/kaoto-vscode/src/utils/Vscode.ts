/**
 * Copyright 2025 Red Hat, Inc. and/or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ExtensionContext } from 'vscode';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';

export function safeGlobalStateGet<T>(context: ExtensionContext, key: string, defaultValue: T): T {
	try {
		return context.globalState.get<T>(key, defaultValue);
	} catch (err) {
		KaotoOutputChannel.logWarning(`Unable to read global state for key '${key}': ${String(err)}`);
		return defaultValue;
	}
}

export async function safeGlobalStateUpdate(context: ExtensionContext, key: string, value: any): Promise<void> {
	try {
		await context.globalState.update(key, value);
	} catch (err) {
		KaotoOutputChannel.logWarning(`Unable to update global state for key '${key}': ${String(err)}`);
	}
}
