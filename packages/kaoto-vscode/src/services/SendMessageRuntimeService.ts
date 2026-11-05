import type { SendMessageRuntimeSnapshot } from '@kaoto/kaoto/models';
import { isAbsolute } from 'path'; // NOSONAR
import { Uri } from 'vscode';
import { arePathsEqual } from '../utils/Path';

export interface LocalDeploymentRoute {
	sourcePath: string;
	routeId: string;
	state: string;
	consolePort: number;
	label: string;
}

export interface ResolvedSendTarget extends LocalDeploymentRoute {
	pid: number;
}

interface DeploymentSource {
	refresh(): Promise<void>;
	getSnapshot(): readonly LocalDeploymentRoute[];
}

function validPid(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Resolves targets only from the host's known local deployments and document identity. */
export class SendMessageRuntimeService {
	constructor(private readonly deployments: DeploymentSource) {}

	private async readPid(port: number): Promise<number | null> {
		for (const path of ['/q/dev/jvm', '/observe/jolokia/read/java.lang:type=Runtime/Pid']) {
			try {
				const response = await fetch(`http://localhost:${port}${path}`, {
					headers: { Accept: 'application/json' },
					signal: AbortSignal.timeout(3000),
				});
				if (!response.ok) {
					continue;
				}
				const data = await response.json();
				let pid: unknown;
				if (path === '/q/dev/jvm') {
					pid = data?.jvm?.pid;
				} else {
					pid = data?.status === 200 ? data.value : null;
				}
				if (validPid(pid)) {
					return pid;
				}
			} catch {
				/* A missing console can return HTTP 200 with plain text. Try the next identity source. */
			}
		}
		return null;
	}

	private async targets(documentUri: Uri) {
		if (documentUri.scheme !== 'file') {
			return [];
		}
		const rows = this.deployments.getSnapshot().filter((row) => isAbsolute(row.sourcePath) && arePathsEqual(row.sourcePath, documentUri.fsPath));
		const pids = new Map<number, Promise<number | null>>();
		return Promise.all(
			rows.map(async (row) => {
				if (!pids.has(row.consolePort)) {
					pids.set(row.consolePort, this.readPid(row.consolePort));
				}
				const pid = await pids.get(row.consolePort)!;
				return { row, pid, id: JSON.stringify([row.consolePort, pid, row.sourcePath, row.routeId]) };
			}),
		);
	}

	async getSnapshot(documentUri: Uri): Promise<SendMessageRuntimeSnapshot> {
		const targets = await this.targets(documentUri);
		return { supported: true, targets: targets.map(({ row, pid, id }) => ({ id, pid, routeId: row.routeId, state: row.state, label: row.label })) };
	}

	async resolveTarget(documentUri: Uri, targetId: string, routeId: string): Promise<ResolvedSendTarget> {
		await this.deployments.refresh();
		const targets = await this.targets(documentUri);
		const target = targets.find((item) => item.id === targetId && item.row.routeId === routeId && item.row.state === 'Started');
		if (!target) {
			throw new Error('The selected route instance is no longer available. Refresh the target selection.');
		}
		if (target.pid === null) {
			throw new Error('Could not resolve the runtime identity for the selected route.');
		}
		return { ...target.row, pid: target.pid };
	}
}
