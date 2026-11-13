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
import * as fs from 'fs'; // NOSONAR
import * as path from 'path'; // NOSONAR
import { Readable } from 'stream'; // NOSONAR
import { pipeline } from 'stream/promises'; // NOSONAR
import type { ReadableStream } from 'stream/web'; // NOSONAR

/** Reports the bytes received so far, and the total size when the server sends it. */
export type DownloadProgress = (receivedBytes: number, totalBytes: number | undefined) => void;

export type FileDownload = (url: string, targetPath: string, onProgress?: DownloadProgress, signal?: AbortSignal) => Promise<void>;

export interface FileDownloadOptions {
	/** How long the download waits for data before it fails. */
	timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;

/** The server answered with a status other than 200 OK. */
export class HttpStatusError extends Error {
	constructor(
		readonly statusCode: number,
		readonly url: string,
	) {
		super(`HTTP ${statusCode} for ${url}`);
		this.name = 'HttpStatusError';
	}
}

/**
 * @returns a download with `fetch`, which follows up to 20 redirects; the download fails when no data comes
 * for the timeout, reports its progress and stops when its signal aborts
 */
export function createFileDownload({ timeoutMs = DEFAULT_TIMEOUT_MS }: FileDownloadOptions = {}): FileDownload {
	return async (url, targetPath, onProgress, signal) => {
		const timeoutError = new Error(`No data from ${url} for ${timeoutMs / 1000} seconds`);
		const idle = new AbortController();
		let timer: NodeJS.Timeout | undefined;
		const restartTimer = () => {
			clearTimeout(timer);
			timer = setTimeout(() => idle.abort(timeoutError), timeoutMs);
		};
		const stop = signal ? AbortSignal.any([signal, idle.signal]) : idle.signal;
		restartTimer();
		try {
			// no compression, so that the Content-Length is the size of the bytes that come
			const response = await fetch(url, { signal: stop, headers: { 'Accept-Encoding': 'identity' } }).catch((error: unknown) => {
				throw explainFetchFailure(error, url);
			});
			if (response.status !== 200) {
				await response.body?.cancel();
				throw new HttpStatusError(response.status, url);
			}
			if (!response.body) {
				throw new Error(`Empty response from ${url}`);
			}
			const totalBytes = Number(response.headers.get('content-length')) || undefined;
			let receivedBytes = 0;
			const body = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
			body.on('data', (chunk: Buffer) => {
				restartTimer();
				receivedBytes += chunk.length;
				onProgress?.(receivedBytes, totalBytes);
			});
			await pipeline(body, fs.createWriteStream(targetPath), { signal: stop });
		} catch (error) {
			throw idle.signal.aborted && !signal?.aborted ? timeoutError : error;
		} finally {
			clearTimeout(timer);
		}
	};
}

/** Downloads a file with the default timeout. */
export const downloadFile: FileDownload = createFileDownload();

/**
 * @returns the reason of a failed `fetch`, which only tells `fetch failed` and keeps the reason in its cause
 */
function explainFetchFailure(error: unknown, url: string): unknown {
	if (error instanceof TypeError && error.cause instanceof Error) {
		return new Error(`${error.cause.message} for ${url}`, { cause: error });
	}
	return error;
}

export interface DownloadIntoPlaceOptions {
	onProgress?: DownloadProgress;
	/** Cancels the download, which then keeps no file. */
	signal?: AbortSignal;
	/** Checks the downloaded file before it is put in place, and rejects to keep nothing. */
	verify?: (downloadedPath: string) => Promise<void>;
}

/**
 * Downloads a file next to its target and renames it into place, so that an interrupted or rejected download
 * is never taken for the file. Each download gets its own partial file, because all the windows of a profile
 * share the extension storage.
 */
export async function downloadIntoPlace(
	download: FileDownload,
	url: string,
	targetPath: string,
	{ onProgress, signal, verify }: DownloadIntoPlaceOptions = {},
): Promise<void> {
	await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
	const partPath = `${targetPath}.${process.pid}-${globalThis.crypto.randomUUID()}.part`;
	try {
		await download(url, partPath, onProgress, signal);
		await verify?.(partPath);
		await moveIntoPlace(partPath, targetPath);
	} finally {
		// nothing is left to remove after the rename
		await fs.promises.rm(partPath, { force: true });
	}
}

/**
 * Renames a download to its target. Another window can put the same file there first and run it;
 * Windows cannot replace a JAR in use, and the one in place is kept.
 */
async function moveIntoPlace(partPath: string, targetPath: string): Promise<void> {
	try {
		await fs.promises.rename(partPath, targetPath);
	} catch (error) {
		if (!fs.existsSync(targetPath)) {
			throw error;
		}
	}
}
