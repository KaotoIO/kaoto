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
import { InfraRunningServiceDetails } from '../../executors/types/ExecutorTypes';
import { RunningInfrastructureService } from './InfrastructureItem';

/**
 * Single place that maps the details reported by the Camel CLI (`infra ps`) onto a tracked service,
 * so a new CLI field only needs to be added here.
 */

/**
 * Applies the latest CLI details to an already tracked service, keeping the managed properties
 * (name, args, terminal name, isExternal).
 * Details that the CLI reports only occasionally keep their previous value, but `uiUrl` always follows
 * the latest snapshot: a service restarted without its UI must not keep a stale link.
 */
export function mergeCliDetails(current: RunningInfrastructureService, cli: InfraRunningServiceDetails): RunningInfrastructureService {
	return {
		...current,
		description: cli.description ?? current.description,
		port: cli.port ?? current.port,
		url: cli.url ?? current.url,
		uiUrl: cli.uiUrl,
		uiSupported: cli.uiSupported ?? current.uiSupported,
		status: 'running',
	};
}

/**
 * Builds the tracked entry for a service that is running in the CLI but was not started by Kaoto.
 */
export function createExternalService(cli: InfraRunningServiceDetails): RunningInfrastructureService {
	return {
		name: cli.name,
		description: cli.description,
		port: cli.port,
		url: cli.url,
		uiUrl: cli.uiUrl,
		uiSupported: cli.uiSupported,
		args: [],
		terminalName: `${cli.name} (external)`,
		status: 'running',
		isExternal: true,
	};
}
