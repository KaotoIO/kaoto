import type { SendMessageRequest } from '@kaoto/kaoto/models';
import { mkdtemp, writeFile, rm } from 'fs/promises'; // NOSONAR
import { unlinkSync } from 'fs'; // NOSONAR
import { tmpdir } from 'os'; // NOSONAR
import { dirname, join } from 'path'; // NOSONAR
import type { Uri } from 'vscode';
import { CamelCommandAPI } from '../executors/api/CamelCommandAPI';
import type { SendMessageRuntimeService } from './SendMessageRuntimeService';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';

/** Owns temporary message files; their names and contents are never shell commands. */
export class SendMessageService {
	constructor(private readonly runtimes: Pick<SendMessageRuntimeService, 'resolveTarget'>) {}

	/** An expired request may finish cleanup, but must never start a later delivery. */
	async send(documentUri: Uri, request: SendMessageRequest, signal?: AbortSignal): Promise<void> {
		signal?.throwIfAborted();
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
			if (args.some((arg) => Array.from(arg).some((character) => character.codePointAt(0)! < 32 && !'\b\t\n\f\r'.includes(character)))) {
				throw new Error('Unsupported control character in text or headers. Use a file payload for binary content.');
			}
			const argumentFile = join(directory, 'message.args');
			await writeFile(argumentFile, args.map((arg) => JSON.stringify(arg)).join('\n') + '\n', { mode: 0o600 });
			const revoke = () => {
				try {
					// Revoke synchronously: a queued Windows task must not read arguments after cancellation.
					unlinkSync(argumentFile);
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
						KaotoOutputChannel.logError('Could not revoke cancelled message arguments', error);
					}
				}
			};
			signal?.addEventListener('abort', revoke, { once: true });
			try {
				signal?.throwIfAborted();
				const target = await this.runtimes.resolveTarget(documentUri, request.targetId, request.routeId, signal);
				signal?.throwIfAborted();
				await CamelCommandAPI.sendMessage(target.pid, target.routeId, argumentFile, dirname(documentUri.fsPath), signal);
			} finally {
				signal?.removeEventListener('abort', revoke);
			}
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	}
}
