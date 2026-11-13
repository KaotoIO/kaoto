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
import { expect } from 'chai';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { CamelLspServerDownloader, CamelLspServerRelease } from '../../lsp/CamelLspServerDownloader';
import { FileDownload } from '../../utils/Download';

const JAR_CONTENT = 'camel-lsp-server jar content';
const JAR_SHA256 = crypto.createHash('sha256').update(JAR_CONTENT).digest('hex');
const VERSION = '1.2.3';
const RELEASE: CamelLspServerRelease = { version: VERSION, sha256: JAR_SHA256 };

async function getRejection(promise: Promise<unknown>): Promise<Error> {
	try {
		await promise;
	} catch (error) {
		return error as Error;
	}
	throw new Error('The promise was expected to be rejected');
}

suite('CamelLspServerDownloader', () => {
	let storageDir: string;
	let requestedUrls: string[];

	const downloadWriting =
		(content: string): FileDownload =>
		async (url, targetPath, onProgress) => {
			requestedUrls.push(url);
			await fs.promises.writeFile(targetPath, content);
			onProgress?.(content.length, content.length);
		};

	const versionDir = () => path.join(storageDir, 'camel-lsp-server', VERSION);

	setup(() => {
		storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-lsp-server-'));
		requestedUrls = [];
	});

	teardown(() => {
		fs.rmSync(storageDir, { recursive: true, force: true });
	});

	test('downloads the release JAR from Maven Central into the storage', async () => {
		const downloader = new CamelLspServerDownloader(storageDir, RELEASE, downloadWriting(JAR_CONTENT));

		const jarPath = await downloader.ensureServerJar();

		expect(jarPath).to.equal(path.join(versionDir(), `camel-lsp-server-${VERSION}.jar`));
		expect(fs.readFileSync(jarPath, 'utf8')).to.equal(JAR_CONTENT);
		expect(requestedUrls).to.deep.equal([
			`https://repo1.maven.org/maven2/com/github/camel-tooling/camel-lsp-server/${VERSION}/camel-lsp-server-${VERSION}.jar`,
		]);
		expect(fs.readdirSync(versionDir())).to.deep.equal([`camel-lsp-server-${VERSION}.jar`]);
	});

	test('reuses the downloaded JAR', async () => {
		const downloader = new CamelLspServerDownloader(storageDir, RELEASE, downloadWriting(JAR_CONTENT));
		expect(downloader.isDownloaded()).to.be.false;

		const jarPath = await downloader.ensureServerJar();

		expect(downloader.isDownloaded()).to.be.true;
		expect(await downloader.ensureServerJar()).to.equal(jarPath);
		expect(requestedUrls).to.have.lengthOf(1);
	});

	test('reports the download progress', async () => {
		const downloader = new CamelLspServerDownloader(storageDir, RELEASE, downloadWriting(JAR_CONTENT));
		const progress: Array<[number, number | undefined]> = [];

		await downloader.ensureServerJar((receivedBytes, totalBytes) => progress.push([receivedBytes, totalBytes]));

		expect(progress).to.deep.equal([[JAR_CONTENT.length, JAR_CONTENT.length]]);
	});

	test('rejects a JAR with another checksum and keeps nothing', async () => {
		const downloader = new CamelLspServerDownloader(storageDir, RELEASE, downloadWriting('tampered content'));

		const error = await getRejection(downloader.ensureServerJar());

		expect(error.message).to.contain('Checksum mismatch').and.contain(JAR_SHA256);
		expect(downloader.isDownloaded()).to.be.false;
		expect(fs.readdirSync(versionDir())).to.be.empty;
	});

	test('keeps nothing when the download fails', async () => {
		const failingDownload: FileDownload = async (_url, targetPath) => {
			await fs.promises.writeFile(targetPath, 'partial content');
			throw new Error('HTTP 503');
		};
		const downloader = new CamelLspServerDownloader(storageDir, RELEASE, failingDownload);

		const error = await getRejection(downloader.ensureServerJar());

		expect(error.message).to.equal('HTTP 503');
		expect(fs.readdirSync(versionDir())).to.be.empty;
	});

	test('keeps nothing when the download is cancelled', async () => {
		const abort = new AbortController();
		const cancelledDownload: FileDownload = async (_url, targetPath, _onProgress, signal) => {
			await fs.promises.writeFile(targetPath, 'partial content');
			abort.abort();
			signal?.throwIfAborted();
		};
		const downloader = new CamelLspServerDownloader(storageDir, RELEASE, cancelledDownload);

		const error = await getRejection(downloader.ensureServerJar(undefined, abort.signal));

		expect(error.name).to.equal('AbortError');
		expect(fs.readdirSync(versionDir())).to.be.empty;
	});

	test('keeps two windows downloading at once apart', async () => {
		const partPaths: string[] = [];
		// writes in two steps, so that the two downloads interleave
		const slowDownload: FileDownload = async (_url, targetPath) => {
			partPaths.push(targetPath);
			await fs.promises.writeFile(targetPath, JAR_CONTENT.slice(0, 5));
			await new Promise((resolve) => setTimeout(resolve, 20));
			await fs.promises.appendFile(targetPath, JAR_CONTENT.slice(5));
		};
		const firstWindow = new CamelLspServerDownloader(storageDir, RELEASE, slowDownload);
		const secondWindow = new CamelLspServerDownloader(storageDir, RELEASE, slowDownload);

		const jarPaths = await Promise.all([firstWindow.ensureServerJar(), secondWindow.ensureServerJar()]);

		expect(new Set(partPaths).size).to.equal(2);
		expect(jarPaths[1]).to.equal(jarPaths[0]);
		expect(fs.readFileSync(jarPaths[0], 'utf8')).to.equal(JAR_CONTENT);
		expect(fs.readdirSync(versionDir())).to.deep.equal([`camel-lsp-server-${VERSION}.jar`]);
	});

	test('keeps the JAR that another window put in place when it cannot be replaced', async () => {
		const jarPath = path.join(versionDir(), `camel-lsp-server-${VERSION}.jar`);
		const originalRename = fs.promises.rename;
		// on Windows, the JAR of a server that another window runs cannot be replaced
		fs.promises.rename = () => Promise.reject(Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' }));
		try {
			const downloader = new CamelLspServerDownloader(storageDir, RELEASE, async (url, targetPath, onProgress) => {
				await downloadWriting(JAR_CONTENT)(url, targetPath, onProgress);
				await fs.promises.writeFile(jarPath, JAR_CONTENT);
			});

			expect(await downloader.ensureServerJar()).to.equal(jarPath);
		} finally {
			fs.promises.rename = originalRename;
		}

		expect(fs.readdirSync(versionDir())).to.deep.equal([`camel-lsp-server-${VERSION}.jar`]);
	});

	test('removes the JARs of the other releases after a download', async () => {
		const previousJar = path.join(storageDir, 'camel-lsp-server', '1.0.0', 'camel-lsp-server-1.0.0.jar');
		fs.mkdirSync(path.dirname(previousJar), { recursive: true });
		fs.writeFileSync(previousJar, 'previous release');
		const downloader = new CamelLspServerDownloader(storageDir, RELEASE, downloadWriting(JAR_CONTENT));

		await downloader.ensureServerJar();

		expect(fs.readdirSync(path.join(storageDir, 'camel-lsp-server'))).to.deep.equal([VERSION]);
	});

	test('downloads the release pinned in the extension package.json', () => {
		const release: CamelLspServerRelease = vscode.extensions.getExtension('redhat.vscode-kaoto')?.packageJSON.camelLanguageServer;
		const downloader = new CamelLspServerDownloader(storageDir, release);

		expect(release.version).to.match(/^\d+\.\d+\.\d+$/);
		// the hash is compared with a lowercase hex digest
		expect(release.sha256).to.match(/^[0-9a-f]{64}$/);
		expect(downloader.getDownloadUrl()).to.match(/\/camel-lsp-server\/\d+\.\d+\.\d+\/camel-lsp-server-\d+\.\d+\.\d+\.jar$/);
	});
});
