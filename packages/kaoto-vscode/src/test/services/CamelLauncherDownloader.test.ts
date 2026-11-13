import { assert } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { CamelLauncherDownloader, LauncherNotFoundError } from '../../services/CamelLauncherDownloader';
import { FileDownload, HttpStatusError } from '../../utils/Download';
import { isRedHatBuild } from '../../utils/Version';

suite('CamelLauncherDownloader Tests', () => {
	let downloader: CamelLauncherDownloader;
	let testStoragePath: string;

	setup(() => {
		// Create a temporary storage path for testing
		testStoragePath = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-launcher-storage-'));
		// Pass undefined for context and use custom storage dir
		downloader = new CamelLauncherDownloader(undefined, testStoragePath);
	});

	teardown(() => {
		// Cleanup test storage
		if (fs.existsSync(testStoragePath)) {
			fs.rmSync(testStoragePath, { recursive: true, force: true });
		}
	});

	test('Should get storage directory', () => {
		const storageDir = downloader.getStorageDirectory();

		assert.equal(storageDir, testStoragePath);
	});

	test('Should create storage directory if it does not exist', () => {
		const newStoragePath = path.join(testStoragePath, 'new-test-storage');

		const newDownloader = new CamelLauncherDownloader(undefined, newStoragePath);

		// Storage path should be created
		assert.isTrue(fs.existsSync(newStoragePath));
		assert.equal(newDownloader.getStorageDirectory(), newStoragePath);
	});

	test('Should return cached JAR path if launcher already exists', async () => {
		const version = '4.18.0';
		const launcherDir = path.join(testStoragePath, `camel-launcher-${version}`);

		// Create the directory structure with JAR
		fs.mkdirSync(launcherDir, { recursive: true });

		// Create JAR file
		const jarPath = path.join(launcherDir, `camel-launcher-${version}.jar`);
		fs.writeFileSync(jarPath, 'fake jar content');

		// Should return cached JAR path without downloading
		const result = await downloader.ensureLauncher(version);

		assert.equal(result, jarPath);
	});

	test('Should find launcher JAR in directory', async () => {
		const version = '4.18.0';
		const launcherDir = path.join(testStoragePath, `camel-launcher-${version}`);

		// Create the directory structure
		fs.mkdirSync(launcherDir, { recursive: true });

		// Create JAR file
		const jarPath = path.join(launcherDir, `camel-launcher-${version}.jar`);
		fs.writeFileSync(jarPath, 'fake jar content');

		// Should find the JAR
		const result = await downloader.ensureLauncher(version);

		assert.equal(result, jarPath);
		assert.isTrue(fs.existsSync(result));
	});

	test('Should handle missing launcher directory gracefully', async () => {
		const version = '999.999.999';
		const launcherDir = path.join(testStoragePath, `camel-launcher-${version}`);

		// Ensure directory doesn't exist
		if (fs.existsSync(launcherDir)) {
			fs.rmSync(launcherDir, { recursive: true, force: true });
		}

		// Inject a download that answers HTTP 404 without hitting the network
		const notFoundDownload: FileDownload = (url) => Promise.reject(new HttpStatusError(404, url));
		const notFoundDownloader = new CamelLauncherDownloader(undefined, testStoragePath, notFoundDownload);

		try {
			await notFoundDownloader.ensureLauncher(version);
			assert.fail('Should have thrown an error');
		} catch (error) {
			assert.instanceOf(error, LauncherNotFoundError);
			assert.include(error.message, 'is not available');
		}
	});

	test('Should download the launcher JAR from Maven Central into the storage', async () => {
		const version = '4.18.0';
		const requestedUrls: string[] = [];
		const download: FileDownload = async (url, targetPath) => {
			requestedUrls.push(url);
			await fs.promises.writeFile(targetPath, 'downloaded jar content');
		};
		const launcherDir = path.join(testStoragePath, `camel-launcher-${version}`);

		const result = await new CamelLauncherDownloader(undefined, testStoragePath, download).ensureLauncher(version);

		assert.equal(result, path.join(launcherDir, `camel-launcher-${version}.jar`));
		assert.equal(fs.readFileSync(result, 'utf8'), 'downloaded jar content');
		assert.deepEqual(requestedUrls, [`https://repo1.maven.org/maven2/org/apache/camel/camel-launcher/${version}/camel-launcher-${version}.jar`]);
		assert.deepEqual(fs.readdirSync(launcherDir), [`camel-launcher-${version}.jar`]);
	});

	test('Should download a RedHat build from the RedHat Maven repository', async () => {
		const version = '4.14.2.redhat-00006';
		const requestedUrls: string[] = [];
		const download: FileDownload = async (url, targetPath) => {
			requestedUrls.push(url);
			await fs.promises.writeFile(targetPath, 'downloaded jar content');
		};

		await new CamelLauncherDownloader(undefined, testStoragePath, download).ensureLauncher(version);

		assert.deepEqual(requestedUrls, [`https://maven.repository.redhat.com/ga/org/apache/camel/camel-launcher/${version}/camel-launcher-${version}.jar`]);
	});

	test('Should keep no partial JAR when the download fails', async () => {
		const version = '4.18.0';
		const failingDownload: FileDownload = async (_url, targetPath) => {
			await fs.promises.writeFile(targetPath, 'partial content');
			throw new Error('No data for 60 seconds');
		};
		const failingDownloader = new CamelLauncherDownloader(undefined, testStoragePath, failingDownload);

		try {
			await failingDownloader.ensureLauncher(version);
			assert.fail('Should have thrown an error');
		} catch (error) {
			assert.notInstanceOf(error, LauncherNotFoundError);
			assert.include((error as Error).message, `Failed to download Camel Launcher ${version}`);
			assert.include((error as Error).message, 'No data for 60 seconds');
		}
		assert.isEmpty(fs.readdirSync(path.join(testStoragePath, `camel-launcher-${version}`)));
	});

	test('Should return JAR path directly', async () => {
		const version = '4.18.0';
		const launcherDir = path.join(testStoragePath, `camel-launcher-${version}`);
		fs.mkdirSync(launcherDir, { recursive: true });

		// Create JAR file
		const jarPath = path.join(launcherDir, `camel-launcher-${version}.jar`);
		fs.writeFileSync(jarPath, 'fake jar content');

		const result = await downloader.ensureLauncher(version);

		// Should return JAR path directly (not wrapper script)
		assert.equal(result, jarPath);
		assert.isTrue(result.endsWith('.jar'));
	});

	test('Should detect RedHat build versions', () => {
		assert.isTrue(isRedHatBuild('4.14.2.redhat-00006'));
		assert.isTrue(isRedHatBuild('4.14.2.redhat-00019'));
		assert.isFalse(isRedHatBuild('4.18.0'));
		assert.isFalse(isRedHatBuild('4.14.5'));
	});

	test('Should use RedHat Maven repository for RedHat builds', () => {
		// Access private method through any cast for testing
		const downloaderAny = downloader as any;

		const redhatUrl = downloaderAny.getMavenBaseUrl('4.14.2.redhat-00006');
		const communityUrl = downloaderAny.getMavenBaseUrl('4.18.0');

		assert.include(redhatUrl, 'maven.repository.redhat.com');
		assert.include(communityUrl, 'repo1.maven.org');
	});
});
