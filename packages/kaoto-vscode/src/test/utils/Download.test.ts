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
import * as fs from 'fs';
import * as http from 'http';
import type { AddressInfo } from 'net';
import * as os from 'os';
import * as path from 'path';
import { createFileDownload, downloadIntoPlace, FileDownload, HttpStatusError } from '../../utils/Download';

const CONTENT = 'downloaded file content';

async function getRejection(promise: Promise<unknown>): Promise<Error> {
	try {
		await promise;
	} catch (error) {
		return error as Error;
	}
	throw new Error('The promise was expected to be rejected');
}

suite('Download', () => {
	let tempDir: string;
	let targetPath: string;
	let server: http.Server;
	let baseUrl: string;
	let handler: http.RequestListener;

	// the requests go to a local plain HTTP server; the extension downloads over HTTPS
	const download = (timeoutMs?: number): FileDownload => createFileDownload({ timeoutMs });

	setup(async () => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-download-'));
		targetPath = path.join(tempDir, 'file.jar');
		server = http.createServer((request, response) => handler(request, response));
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	teardown(async () => {
		server.closeAllConnections();
		await new Promise((resolve) => server.close(resolve));
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	suite('createFileDownload', () => {
		test('downloads the file uncompressed and reports the progress', async () => {
			let acceptEncoding: string | undefined;
			handler = (request, response) => {
				acceptEncoding = request.headers['accept-encoding'];
				response.writeHead(200, { 'Content-Length': CONTENT.length });
				response.end(CONTENT);
			};
			const progress: Array<[number, number | undefined]> = [];

			await download()(`${baseUrl}/file.jar`, targetPath, (receivedBytes, totalBytes) => progress.push([receivedBytes, totalBytes]));

			expect(fs.readFileSync(targetPath, 'utf8')).to.equal(CONTENT);
			expect(progress.at(-1)).to.deep.equal([CONTENT.length, CONTENT.length]);
			// a compressed body would make the received bytes exceed the Content-Length
			expect(acceptEncoding).to.equal('identity');
		});

		test('follows the redirects of every kind', async () => {
			const redirects: Record<string, [number, string]> = {
				'/301': [301, `${baseUrl}/302`],
				'/302': [302, '/303'],
				'/303': [303, '307'],
				'/307': [307, `${baseUrl}/308`],
				'/308': [308, '/file.jar'],
			};
			const requestedPaths: string[] = [];
			handler = (request, response) => {
				requestedPaths.push(request.url ?? '');
				const redirect = redirects[request.url ?? ''];
				if (redirect) {
					response.writeHead(redirect[0], { Location: redirect[1] });
					response.end();
					return;
				}
				response.end(CONTENT);
			};

			await download()(`${baseUrl}/301`, targetPath);

			expect(requestedPaths).to.deep.equal(['/301', '/302', '/303', '/307', '/308', '/file.jar']);
			expect(fs.readFileSync(targetPath, 'utf8')).to.equal(CONTENT);
		});

		test('fails after 20 redirects', async () => {
			let requests = 0;
			handler = (_request, response) => {
				requests++;
				response.writeHead(302, { Location: `/loop-${requests}` });
				response.end();
			};

			const error = await getRejection(download()(`${baseUrl}/loop`, targetPath));

			expect(error.message).to.equal(`redirect count exceeded for ${baseUrl}/loop`);
			expect(requests).to.equal(21);
		});

		test('rejects a status other than 200 OK with its status code', async () => {
			handler = (_request, response) => {
				response.writeHead(404);
				response.end('not found');
			};

			const error = await getRejection(download()(`${baseUrl}/missing.jar`, targetPath));

			expect(error).to.be.instanceOf(HttpStatusError);
			expect((error as HttpStatusError).statusCode).to.equal(404);
			expect(error.message).to.equal(`HTTP 404 for ${baseUrl}/missing.jar`);
		});

		test('fails when no response comes for the timeout', async () => {
			handler = () => {
				// never answers
			};

			const error = await getRejection(download(100)(`${baseUrl}/file.jar`, targetPath));

			expect(error.message).to.contain('No data from').and.contain('0.1 seconds');
		});

		test('fails when the data stops coming for the timeout', async () => {
			handler = (_request, response) => {
				response.writeHead(200, { 'Content-Length': CONTENT.length });
				// sends a part of the content and then nothing more
				response.write(CONTENT.slice(0, 5));
			};

			const error = await getRejection(download(100)(`${baseUrl}/file.jar`, targetPath));

			expect(error.message).to.contain('No data from');
		});

		test('stops when the signal aborts while the data comes', async () => {
			const abort = new AbortController();
			handler = (_request, response) => {
				response.writeHead(200, { 'Content-Length': CONTENT.length });
				// sends a part of the content, and the user cancels before the rest comes
				response.write(CONTENT.slice(0, 5), () => setTimeout(() => abort.abort(), 50));
			};

			const error = await getRejection(download()(`${baseUrl}/file.jar`, targetPath, undefined, abort.signal));

			expect(error.name).to.equal('AbortError');
		});

		test('stops when the signal aborts before the response comes', async () => {
			const abort = new AbortController();
			handler = () => abort.abort();

			const error = await getRejection(download()(`${baseUrl}/file.jar`, targetPath, undefined, abort.signal));

			expect(error.name).to.equal('AbortError');
		});

		test('starts nothing when the signal already aborted', async () => {
			let requests = 0;
			handler = () => requests++;

			const error = await getRejection(download()(`${baseUrl}/file.jar`, targetPath, undefined, AbortSignal.abort()));

			expect(error.name).to.equal('AbortError');
			expect(requests).to.equal(0);
		});
	});

	suite('downloadIntoPlace', () => {
		const writing: FileDownload = async (_url, partPath) => {
			await fs.promises.writeFile(partPath, CONTENT);
		};

		test('puts the download in place and keeps no partial file', async () => {
			const nestedTarget = path.join(tempDir, 'nested', 'file.jar');

			await downloadIntoPlace(writing, `${baseUrl}/file.jar`, nestedTarget);

			expect(fs.readFileSync(nestedTarget, 'utf8')).to.equal(CONTENT);
			expect(fs.readdirSync(path.dirname(nestedTarget))).to.deep.equal(['file.jar']);
		});

		test('keeps nothing when the download fails', async () => {
			const failing: FileDownload = async (_url, partPath) => {
				await fs.promises.writeFile(partPath, 'partial');
				throw new Error('offline');
			};

			const error = await getRejection(downloadIntoPlace(failing, `${baseUrl}/file.jar`, targetPath));

			expect(error.message).to.equal('offline');
			expect(fs.readdirSync(tempDir)).to.be.empty;
		});

		test('keeps nothing when the verification rejects the download', async () => {
			const verify = () => Promise.reject(new Error('Checksum mismatch'));

			const error = await getRejection(downloadIntoPlace(writing, `${baseUrl}/file.jar`, targetPath, { verify }));

			expect(error.message).to.equal('Checksum mismatch');
			expect(fs.readdirSync(tempDir)).to.be.empty;
		});
	});
});
