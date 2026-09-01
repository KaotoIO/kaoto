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

/**
 * This class is used for automatic port allocation for Camel Run commands using --console parameter
 */
import { getRandomPort } from 'get-port-please';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import waitOn from 'wait-on';

export class PortManager {
	private readonly usedPorts: Set<number> = new Set();

	public async allocatePort(): Promise<number> {
		const port = await getRandomPort('localhost');
		this.usedPorts.add(port);
		return port;
	}

	public getUsedPorts(): Set<number> {
		return this.usedPorts;
	}

	public releasePort(port: number): void {
		this.usedPorts.delete(port);
		KaotoOutputChannel.logInfo(`Port ${port} released and marked as free`);
	}

	public async waitForPortReachable(port: number, timeout: number = 120_000, interval: number = 250): Promise<boolean> {
		try {
			await waitOn({
				resources: [`tcp:localhost:${port}`],
				interval,
				timeout,
				tcpTimeout: 1_000,
			});
			KaotoOutputChannel.logInfo(`Port ${port} is now reachable`);
			return true;
		} catch (err) {
			KaotoOutputChannel.logError(`Timeout ${timeout}ms reached. Port ${port} not reachable.`, err);
			return false;
		}
	}
}
