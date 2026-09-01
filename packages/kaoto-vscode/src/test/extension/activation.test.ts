/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License", destination); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { waitUntil } from 'async-wait-until';
import { assert } from 'chai';
import * as vscode from 'vscode';

suite('Extension is activated', function () {
	this.timeout(15_000);
	test('Extension is activated', async () => {
		const extension = vscode.extensions.getExtension('redhat.vscode-kaoto');
		assert.isNotNull(extension, 'VS Code Kaoto not found');
		const activated = await waitUntil(
			async () => {
				return extension?.isActive;
			},
			10_000,
			500,
		);
		assert.isTrue(activated, 'VS Code Kaoto is not activated despite the workspace used for tests contains yaml files');
	});
});
