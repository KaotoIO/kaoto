import { assert } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import { CamelLauncherDownloader, LauncherNotFoundError } from '../../services/CamelLauncherDownloader';
import { isRedHatBuild } from '../../utils/Version';

suite('CamelLauncherDownloader Tests', () => {
	let downloader: CamelLauncherDownloader;
	let testStoragePath: string;

	setup(() => {
		// Create a temporary storage path for testing
		testStoragePath = path.join(__dirname, '..', '..', '..', 'test-storage');
		if (!fs.existsSync(testStoragePath)) {
			fs.mkdirSync(testStoragePath, { recursive: true });
		}
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
		const newStoragePath = path.join(__dirname, '..', '..', '..', 'new-test-storage');

		// Remove if exists
		if (fs.existsSync(newStoragePath)) {
			fs.rmSync(newStoragePath, { recursive: true, force: true });
		}

		const newDownloader = new CamelLauncherDownloader(undefined, newStoragePath);

		// Storage path should be created
		assert.isTrue(fs.existsSync(newStoragePath));
		assert.equal(newDownloader.getStorageDirectory(), newStoragePath);

		// Cleanup
		fs.rmSync(newStoragePath, { recursive: true, force: true });
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

		// Stub the private downloadFile method to simulate HTTP 404 without hitting the network
		const originalDownloadFile = (downloader as any).downloadFile;
		(downloader as any).downloadFile = () => Promise.reject(new Error('Failed to download: HTTP 404'));

		try {
			await downloader.ensureLauncher(version);
			assert.fail('Should have thrown an error');
		} catch (error) {
			assert.instanceOf(error, LauncherNotFoundError);
			assert.include(error.message, 'is not available');
		} finally {
			(downloader as any).downloadFile = originalDownloadFile;
		}
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
