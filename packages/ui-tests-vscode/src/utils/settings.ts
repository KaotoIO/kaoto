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

import * as path from 'path'; // NOSONAR
import * as fs from 'node:fs';
import * as os from 'os'; // NOSONAR

// Enforce same default storage setup as ExTester - see https://github.com/redhat-developer/vscode-extension-tester/wiki/Test-Setup#useful-env-variables
export const storageFolder = process.env.TEST_RESOURCES ? process.env.TEST_RESOURCES : `${os.tmpdir()}/test-resources`;

/**
 * Reset user setting to default value by deleting item in settings.json.
 *
 * @param id ID of setting to reset.
 */
export function resetUserSettings(id: string): void {
	const settingsPath = path.resolve(storageFolder, 'settings', 'User', 'settings.json');
	const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
	if (!(id in settings)) {
		return;
	}
	delete settings[id];
	fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4), 'utf-8');
}

/**
 * Set user setting directly inside settings.json
 *
 * @param id ID of setting.
 * @param value Value of setting.
 */
export function setUserSettingsDirectly(id: string, value: string): void {
	const settingsPath = path.resolve(storageFolder, 'settings', 'User', 'settings.json');
	const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
	settings[id] = value;
	fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4), 'utf-8');
}

/**
 * Read user setting from settings.json
 *
 * @param id ID of setting.
 * @returns Value of setting.
 */
export function readUserSetting(id: string): string {
	const settingsPath = path.resolve(storageFolder, 'settings', 'User', 'settings.json');
	const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
	return settings[id];
}
