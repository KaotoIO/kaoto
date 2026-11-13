/**
 * Copyright 2026 Red Hat, Inc. and/or its affiliates.
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
import { assert } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { TreeItemCollapsibleState } from 'vscode';
import { ChildItem } from '../../../views/deployments/ChildItem';
import { ParentItem } from '../../../views/deployments/ParentItem';
import { Route } from '../../../views/deployments/Route';
import { getExtensionUri } from '../../utils/TestSetup';

suite('ChildItem', function () {
	const integration = new ParentItem('demo', TreeItemCollapsibleState.Expanded, 'parent-localhost', 8080);
	const statistics = { exchangesTotal: 3, exchangesFailed: 1, exchangesInflight: 0 };
	const icons: Record<string, string> = {
		Started: 'route-started.png',
		Suspended: 'route-suspended.png',
		Stopped: 'route-stopped.png',
		Unknown: 'route-default.png',
	};

	for (const [state, icon] of Object.entries(icons)) {
		test(`shows ${icon} for a route in state ${state}`, function () {
			const route = new Route('route-1', 'file:/tmp/demo.camel.yaml:3', 'timer:demo', undefined, state, '1m', statistics);

			const item = new ChildItem(integration, 'route-1', TreeItemCollapsibleState.None, 'child-localhost', route);

			// The icon path starts at the folder of the bundle the code runs from, so check its end and that the icon exists.
			const iconPath = String(item.iconPath);
			const asset = path.join('assets', 'icons', 'deployments', icon);
			assert.isTrue(iconPath.endsWith(path.sep + asset), `${iconPath} does not end with ${asset}`);
			assert.isTrue(fs.existsSync(path.join(getExtensionUri().fsPath, asset)), `${asset} is missing in the extension`);
		});
	}
});
