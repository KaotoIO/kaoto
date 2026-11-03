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
import * as crypto from 'crypto'; // NOSONAR
import * as fs from 'fs'; // NOSONAR
import type { IncomingMessage } from 'http'; // NOSONAR
import * as https from 'https'; // NOSONAR
import * as path from 'path'; // NOSONAR
import { pipeline } from 'stream/promises'; // NOSONAR

/**
 * The Camel Language Server release used by Kaoto, and the SHA-256 of its JAR on Maven Central.
 * It is pinned in the `camelLanguageServer` group of the extension's package.json.
 * Update both together when moving to a new release.
 */
export interface CamelLspServerRelease {
	version: string;
	sha256: string;
}

const MAVEN_CENTRAL_URL = 'https://repo1.maven.org/maven2/com/github/camel-tooling/camel-lsp-server';
const DOWNLOAD_TIMEOUT_MS = 60_000;
const MAX_REDIRECTS = 5;

/** Reports the bytes received so far, and the total size when the server sends it. */
export type DownloadProgress = (receivedBytes: number, totalBytes: number | undefined) => void;

export type FileDownload = (url: string, targetPath: string, onProgress?: DownloadProgress, signal?: AbortSignal) => Promise<void>;

/**
 * Downloads the Camel Language Server JAR from Maven Central into the extension storage, once per release.
 * The JAR is only kept when its SHA-256 matches the expected one.
 */
export class CamelLspServerDownloader {
	private readonly serverDir: string;

	constructor(
		storageDir: string,
		private readonly release: CamelLspServerRelease,
		private readonly download: FileDownload = downloadFile,
	) {
		this.serverDir = path.join(storageDir, 'camel-lsp-server');
	}

	getVersion(): string {
		return this.release.version;
	}

	getJarPath(): string {
		return path.join(this.serverDir, this.release.version, `camel-lsp-server-${this.release.version}.jar`);
	}

	getDownloadUrl(): string {
		return `${MAVEN_CENTRAL_URL}/${this.release.version}/camel-lsp-server-${this.release.version}.jar`;
	}

	isDownloaded(): boolean {
		return fs.existsSync(this.getJarPath());
	}

	/**
	 * @param signal cancels the download, which then keeps no file
	 * @returns the path of the server JAR, downloaded first when it is not in the storage yet
	 */
	async ensureServerJar(onProgress?: DownloadProgress, signal?: AbortSignal): Promise<string> {
		const jarPath = this.getJarPath();
		if (!fs.existsSync(jarPath)) {
			await downloadVerifiedFile(this.download, this.getDownloadUrl(), jarPath, this.release.sha256, onProgress, signal);
			await removeOtherVersions(this.serverDir, this.release.version);
		}
		return jarPath;
	}
}

/**
 * Downloads a file, and keeps it only when its SHA-256 matches the expected one.
 */
export async function downloadVerifiedFile(
	download: FileDownload,
	url: string,
	targetPath: string,
	sha256: string,
	onProgress?: DownloadProgress,
	signal?: AbortSignal,
): Promise<void> {
	await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
	// download next to the target, so that an interrupted download is never taken for the file;
	// one partial file per download, because all the windows of a profile share the storage
	const partPath = `${targetPath}.${process.pid}-${crypto.randomUUID()}.part`;
	try {
		await download(url, partPath, onProgress, signal);
		const actualHash = await computeSha256(partPath);
		if (actualHash !== sha256) {
			throw new Error(`Checksum mismatch for ${url}: expected SHA-256 ${sha256}, got ${actualHash}`);
		}
		await moveIntoPlace(partPath, targetPath);
	} finally {
		// nothing is left to remove after the rename
		await fs.promises.rm(partPath, { force: true });
	}
}

/**
 * Renames a verified download to its target. Another window can put the same release there first and run it;
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

/**
 * Removes the directories of the other versions in a directory that has one directory per version.
 */
export async function removeOtherVersions(dir: string, keptVersion: string): Promise<void> {
	try {
		const entries = await fs.promises.readdir(dir, { withFileTypes: true });
		const otherVersions = entries.filter((entry) => entry.isDirectory() && entry.name !== keptVersion);
		await Promise.all(otherVersions.map((entry) => fs.promises.rm(path.join(dir, entry.name), { recursive: true, force: true })));
	} catch {
		// the other versions only take disk space, they are removed on the next download
	}
}

/**
 * Downloads a file over HTTPS, following redirects.
 */
export async function downloadFile(url: string, targetPath: string, onProgress?: DownloadProgress, signal?: AbortSignal): Promise<void> {
	const response = await get(url, DOWNLOAD_TIMEOUT_MS, signal);
	const totalBytes = Number(response.headers['content-length']) || undefined;
	let receivedBytes = 0;
	response.on('data', (chunk: Buffer) => {
		receivedBytes += chunk.length;
		onProgress?.(receivedBytes, totalBytes);
	});
	await pipeline(response, fs.createWriteStream(targetPath), { signal });
}

/**
 * Sends a GET request over HTTPS, following redirects.
 * @returns the response of the last URL, rejected unless it is 200 OK, when no data comes for the timeout, or when the signal aborts
 */
function get(url: string, timeoutMs: number, signal?: AbortSignal, redirects = MAX_REDIRECTS): Promise<IncomingMessage> {
	return new Promise((resolve, reject) => {
		const request = https.get(url, { timeout: timeoutMs, signal }, (response) => {
			const statusCode = response.statusCode ?? 0;
			const location = response.headers.location;
			if (statusCode >= 300 && statusCode < 400 && location && redirects > 0) {
				response.resume();
				get(new URL(location, url).toString(), timeoutMs, signal, redirects - 1).then(resolve, reject);
				return;
			}
			if (statusCode !== 200) {
				response.resume();
				reject(new Error(`HTTP ${statusCode} for ${url}`));
				return;
			}
			resolve(response);
		});
		request.on('timeout', () => request.destroy(new Error(`No data from ${url} for ${timeoutMs / 1000} seconds`)));
		request.on('error', reject);
	});
}

async function computeSha256(filePath: string): Promise<string> {
	const hash = crypto.createHash('sha256');
	for await (const chunk of fs.createReadStream(filePath)) {
		hash.update(chunk);
	}
	return hash.digest('hex');
}
