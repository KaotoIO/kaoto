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
 * Update both together when moving to a new release.
 */
export const CAMEL_LSP_SERVER_VERSION = '1.36.0';
const CAMEL_LSP_SERVER_SHA256 = '4e35085b7f87e9f6647291a30c5fde8b63e79a2150279f96fc7a12fa61174307';

const MAVEN_CENTRAL_URL = 'https://repo1.maven.org/maven2/com/github/camel-tooling/camel-lsp-server';
const DOWNLOAD_TIMEOUT_MS = 60_000;
const MAX_REDIRECTS = 5;
const HASH_NAMES = { sha256: 'SHA-256' };

/** Reports the bytes received so far, and the total size when the server sends it. */
export type DownloadProgress = (receivedBytes: number, totalBytes: number | undefined) => void;

export type FileDownload = (url: string, targetPath: string, onProgress?: DownloadProgress) => Promise<void>;

/** The hash that a downloaded file must have. */
export interface Checksum {
	algorithm: keyof typeof HASH_NAMES;
	value: string;
}

/**
 * Downloads the Camel Language Server JAR from Maven Central into the extension storage, once per release.
 * The JAR is only kept when its SHA-256 matches the expected one.
 */
export class CamelLspServerDownloader {
	private readonly serverDir: string;

	constructor(
		storageDir: string,
		private readonly version = CAMEL_LSP_SERVER_VERSION,
		private readonly sha256 = CAMEL_LSP_SERVER_SHA256,
		private readonly download: FileDownload = downloadFile,
	) {
		this.serverDir = path.join(storageDir, 'camel-lsp-server');
	}

	getVersion(): string {
		return this.version;
	}

	getJarPath(): string {
		return path.join(this.serverDir, this.version, `camel-lsp-server-${this.version}.jar`);
	}

	getDownloadUrl(): string {
		return `${MAVEN_CENTRAL_URL}/${this.version}/camel-lsp-server-${this.version}.jar`;
	}

	isDownloaded(): boolean {
		return fs.existsSync(this.getJarPath());
	}

	/**
	 * @returns the path of the server JAR, downloaded first when it is not in the storage yet
	 */
	async ensureServerJar(onProgress?: DownloadProgress): Promise<string> {
		const jarPath = this.getJarPath();
		if (fs.existsSync(jarPath)) {
			return jarPath;
		}

		await downloadVerifiedFile(this.download, this.getDownloadUrl(), jarPath, { algorithm: 'sha256', value: this.sha256 }, onProgress);
		await removeOtherVersions(this.serverDir, this.version);
		return jarPath;
	}
}

/**
 * Downloads a file, and keeps it only when its hash matches the checksum.
 */
export async function downloadVerifiedFile(
	download: FileDownload,
	url: string,
	targetPath: string,
	checksum: Checksum,
	onProgress?: DownloadProgress,
): Promise<void> {
	await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
	// download next to the target, so that an interrupted download is never taken for the file
	const partPath = `${targetPath}.part`;
	try {
		await download(url, partPath, onProgress);
		const actualHash = await computeHash(partPath, checksum.algorithm);
		if (actualHash !== checksum.value) {
			const hashName = HASH_NAMES[checksum.algorithm];
			throw new Error(`Checksum mismatch for ${url}: expected ${hashName} ${checksum.value}, got ${actualHash}`);
		}
		await fs.promises.rename(partPath, targetPath);
	} catch (error) {
		await fs.promises.rm(partPath, { force: true });
		throw error;
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
export async function downloadFile(url: string, targetPath: string, onProgress?: DownloadProgress): Promise<void> {
	const response = await get(url, DOWNLOAD_TIMEOUT_MS);
	const totalBytes = Number(response.headers['content-length']) || undefined;
	let receivedBytes = 0;
	response.on('data', (chunk: Buffer) => {
		receivedBytes += chunk.length;
		onProgress?.(receivedBytes, totalBytes);
	});
	await pipeline(response, fs.createWriteStream(targetPath));
}

/**
 * Sends a GET request over HTTPS, following redirects.
 * @returns the response of the last URL, rejected unless it is 200 OK or when no data comes for the timeout
 */
function get(url: string, timeoutMs: number, redirects = MAX_REDIRECTS): Promise<IncomingMessage> {
	return new Promise((resolve, reject) => {
		const request = https.get(url, { timeout: timeoutMs }, (response) => {
			const statusCode = response.statusCode ?? 0;
			const location = response.headers.location;
			if (statusCode >= 300 && statusCode < 400 && location && redirects > 0) {
				response.resume();
				get(new URL(location, url).toString(), timeoutMs, redirects - 1).then(resolve, reject);
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

async function computeHash(filePath: string, algorithm: Checksum['algorithm']): Promise<string> {
	const hash = crypto.createHash(algorithm);
	for await (const chunk of fs.createReadStream(filePath)) {
		hash.update(chunk);
	}
	return hash.digest('hex');
}
