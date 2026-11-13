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

import { ColorScheme } from '@kaoto/kaoto/models';
import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';
import { KAOTO_COLOR_THEME_SETTING_ID } from '../constants';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';

/**
 * Resolves the `kaoto.colorTheme` setting to the scheme the editor must use: `light` and `dark` are fixed, while
 * `auto` follows the active VS Code theme.
 */
export function resolveColorScheme(): ColorScheme.Dark | ColorScheme.Light {
	const theme = vscode.workspace.getConfiguration().get<ColorScheme | null>(KAOTO_COLOR_THEME_SETTING_ID);
	const { kind } = vscode.window.activeColorTheme;
	const dark = kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;
	return theme === ColorScheme.Dark || (theme === ColorScheme.Auto && dark) ? ColorScheme.Dark : ColorScheme.Light;
}

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
