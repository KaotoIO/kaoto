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
import { assert } from 'chai';
import * as vscode from 'vscode';
import { LifecycleRegistrar } from '../../extension/registrars/LifecycleRegistrar';
import { RecommendationCore, IRecommendationService, UserChoice } from '@redhat-developer/vscode-extension-proposals';

suite('LifecycleRegistrar - showRecommendedExtensions', function () {
	let originalGetService: typeof RecommendationCore.getService;
	let createdRecommendations: Array<{ extensionId: string; extensionDisplayName: string; shouldShowOnStartup: boolean }>;
	let registeredRecommendations: any[];

	setup(function () {
		originalGetService = RecommendationCore.getService;
		createdRecommendations = [];
		registeredRecommendations = [];

		// Stub RecommendationCore.getService
		RecommendationCore.getService = function () {
			return {
				create: function (extensionId: string, extensionDisplayName: string, description: string, shouldShowOnStartup: boolean) {
					const recommendation = {
						sourceId: 'kaoto',
						extensionId,
						extensionDisplayName,
						description,
						shouldShowOnStartup,
						timestamp: Date.now(),
						userIgnored: false,
					};
					createdRecommendations.push({ extensionId, extensionDisplayName, shouldShowOnStartup });
					return recommendation;
				},
				register: async function (recommendations: any[]) {
					registeredRecommendations = recommendations;
				},
				show: async function (): Promise<UserChoice | undefined> {
					return undefined;
				},
			} as IRecommendationService;
		};
	});

	teardown(function () {
		RecommendationCore.getService = originalGetService;
	});

	test('should create and register XML and YAML extension recommendations', async function () {
		const context = {} as vscode.ExtensionContext;
		const telemetryService = undefined;

		const registrar = new LifecycleRegistrar(context, telemetryService);
		await registrar.showRecommendedExtensions();

		// Assert that exactly two recommendations were created
		assert.strictEqual(createdRecommendations.length, 2, 'Expected exactly 2 recommendations to be created');

		// Assert XML recommendation
		const xmlRec = createdRecommendations.find((r) => r.extensionId === 'redhat.vscode-xml');
		assert.isDefined(xmlRec, 'XML recommendation should be created');
		assert.strictEqual(xmlRec?.extensionDisplayName, 'XML Language Support by Red Hat');
		assert.strictEqual(xmlRec?.shouldShowOnStartup, true);

		// Assert YAML recommendation
		const yamlRec = createdRecommendations.find((r) => r.extensionId === 'redhat.vscode-yaml');
		assert.isDefined(yamlRec, 'YAML recommendation should be created');
		assert.strictEqual(yamlRec?.extensionDisplayName, 'YAML Language Support by Red Hat');
		assert.strictEqual(yamlRec?.shouldShowOnStartup, true);

		// Assert that both recommendations were registered
		assert.strictEqual(registeredRecommendations.length, 2, 'Expected exactly 2 recommendations to be registered');

		// Verify the registered extension IDs
		const registeredIds = registeredRecommendations.map((r) => r.extensionId);
		assert.include(registeredIds, 'redhat.vscode-xml', 'XML extension should be registered');
		assert.include(registeredIds, 'redhat.vscode-yaml', 'YAML extension should be registered');
	});
});
