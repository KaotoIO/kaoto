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
import * as path from 'path'; // NOSONAR

import { DownloadProgress, downloadFile, downloadIntoPlace, FileDownload } from '../utils/Download';

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
	await downloadIntoPlace(download, url, targetPath, {
		onProgress,
		signal,
		verify: async (downloadedPath) => {
			const actualHash = await computeSha256(downloadedPath);
			if (actualHash !== sha256) {
				throw new Error(`Checksum mismatch for ${url}: expected SHA-256 ${sha256}, got ${actualHash}`);
			}
		},
	});
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

async function computeSha256(filePath: string): Promise<string> {
	const hash = crypto.createHash('sha256');
	for await (const chunk of fs.createReadStream(filePath)) {
		hash.update(chunk);
	}
	return hash.digest('hex');
}
