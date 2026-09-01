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
import * as vscode from 'vscode';
import { TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import { RecommendationCore } from '@redhat-developer/vscode-extension-proposals';
import { satisfies } from 'compare-versions';
import { COMMAND_WHATS_NEW_SHOW, STATE_LAST_WHATS_NEW_SHOWN_VERSION } from '../../constants';
import { safeGlobalStateGet, safeGlobalStateUpdate } from '../../utils/Vscode';
import { KaotoOutputChannel } from '../KaotoOutputChannel';
import { WhatsNewPanel } from '../WhatsNewPanel';
import { sendCommandTrackingEvent } from './TrackingEvent';
import { IRegistrar } from './IRegistrar';

export class LifecycleRegistrar implements IRegistrar {
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly telemetryService: TelemetryService | undefined,
	) {}

	async register(): Promise<void> {
		await this.showRecommendedExtensions();
		await this.showWhatsNewIfNeeded();
	}

	public async showRecommendedExtensions() {
		const recommendService = RecommendationCore.getService(this.context);
		if (recommendService) {
			const xml = recommendService.create(
				'redhat.vscode-xml',
				'XML Language Support by Red Hat',
				'Provides support for creating and editing XML documents.',
				true,
			);
			const yaml = recommendService.create(
				'redhat.vscode-yaml',
				'YAML Language Support by Red Hat',
				'Provides comprehensive YAML Language support with built-in Kubernetes syntax support.',
				true,
			);
			await recommendService.register([xml, yaml]);
		}
	}

	public async showWhatsNewIfNeeded() {
		const currentVersion = this.context.extension.packageJSON.version;
		this.context.subscriptions.push(
			vscode.commands.registerCommand(COMMAND_WHATS_NEW_SHOW, async () => {
				try {
					await WhatsNewPanel.show(this.context, currentVersion);
					await sendCommandTrackingEvent(this.telemetryService, COMMAND_WHATS_NEW_SHOW);
				} catch (err) {
					KaotoOutputChannel.logWarning(`Unable to show What's New: ${String(err)}`);
				}
			}),
		);
		try {
			if (!currentVersion) {
				return;
			}
			const storageKey = STATE_LAST_WHATS_NEW_SHOWN_VERSION;
			const lastShown = safeGlobalStateGet<string | undefined>(this.context, storageKey, undefined);

			// Only show What's New if lastShown is undefined (first install) or lastShown < currentVersion (upgrade)
			if (lastShown && satisfies(lastShown, `>=${currentVersion}`)) {
				return;
			}
			await WhatsNewPanel.show(this.context, currentVersion);
			await safeGlobalStateUpdate(this.context, storageKey, currentVersion);
		} catch (err) {
			KaotoOutputChannel.logWarning(`Unable to show What's New: ${String(err)}`);
		}
	}
}
