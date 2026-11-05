import type { SendMessageRequest } from '@kaoto/kaoto/models';
import { mkdtemp, writeFile, rm } from 'fs/promises'; // NOSONAR
import { tmpdir } from 'os'; // NOSONAR
import { dirname, join } from 'path'; // NOSONAR
import type { Uri } from 'vscode';
import { CamelCommandAPI } from '../executors/api/CamelCommandAPI';
import type { SendMessageRuntimeService } from './SendMessageRuntimeService';

/** Owns temporary message files; their names and contents are never shell commands. */
export class SendMessageService {
	constructor(private readonly runtimes: Pick<SendMessageRuntimeService, 'resolveTarget'>) {}

	async send(documentUri: Uri, request: SendMessageRequest): Promise<void> {
		const directory = await mkdtemp(join(tmpdir(), 'kaoto-send-'));
		try {
			const { payload } = request;
			let body = payload.body ?? '';
			if (payload.bodyType === 'file') {
				if (!payload.bodyFile) {
					throw new Error('Select a file to send.');
				}
				const bytes = Buffer.from(payload.bodyFile.content, 'base64');
				if (bytes.toString('base64') !== payload.bodyFile.content) {
					throw new Error('Invalid file payload encoding.');
				}
				const bodyPath = join(directory, 'payload');
				await writeFile(bodyPath, bytes, { mode: 0o600 });
				body = `file:${bodyPath}`;
			}
			const args = ['--body=' + body, '--timeout=20000', '--show-body=false', '--show-headers=false'];
			for (const [key, value] of Object.entries(payload.headers ?? {})) {
				if (key.includes('=') || !key.trim()) {
					throw new Error('Header names must be non-empty and must not contain "=".');
				}
				args.push(`--header=${key}=${value}`);
			}
			if (args.some((arg) => Array.from(arg).some((character) => character.charCodeAt(0) < 32 && !'\b\t\n\f\r'.includes(character)))) {
				throw new Error('Unsupported control character in text or headers. Use a file payload for binary content.');
			}
			const argumentFile = join(directory, 'message.args');
			await writeFile(argumentFile, args.map((arg) => JSON.stringify(arg)).join('\n') + '\n', { mode: 0o600 });
			const target = await this.runtimes.resolveTarget(documentUri, request.targetId, request.routeId);
			await CamelCommandAPI.sendMessage(target.pid, target.routeId, argumentFile, dirname(documentUri.fsPath));
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	}
}
