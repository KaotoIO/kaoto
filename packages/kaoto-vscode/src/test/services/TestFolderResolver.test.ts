import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TestFolderResolver } from '../../services/TestFolderResolver';

suite('TestFolderResolver', () => {
	let root: string;

	/** Creates the directories (paths ending with `/`) and files below the temporary root */
	const createTree = (entries: string[]) => {
		for (const entry of entries) {
			const fullPath = path.join(root, entry);
			if (entry.endsWith('/')) {
				fs.mkdirSync(fullPath, { recursive: true });
			} else {
				fs.mkdirSync(path.dirname(fullPath), { recursive: true });
				fs.writeFileSync(fullPath, '');
			}
		}
	};

	setup(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-test-folder-'));
	});

	teardown(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	for (const name of ['test', 'tests', 'Tests', 'camel-test', 'routes-tests']) {
		test(`finds a folder named "${name}"`, async () => {
			createTree([`project/src/${name}/`]);

			expect(await TestFolderResolver.resolveTestFolder(path.join(root, 'project'))).to.equal(path.join(root, 'project', 'src', name));
		});
	}

	test('returns a base folder that is a test folder itself, without looking into it', async () => {
		createTree(['camel-tests/unit-test/']);
		const baseDir = path.join(root, 'camel-tests');

		expect(await TestFolderResolver.resolveTestFolder(baseDir)).to.equal(baseDir);
	});

	test('returns the test folder closest to the base folder', async () => {
		createTree(['project/a/b/c/test/', 'project/src/test/']);

		expect(await TestFolderResolver.resolveTestFolder(path.join(root, 'project'))).to.equal(path.join(root, 'project', 'src', 'test'));
	});

	test('does not take a folder whose name only contains "test" for a test folder', async () => {
		createTree(['project/contest/', 'project/testing/', 'project/test-data/']);

		expect(await TestFolderResolver.resolveTestFolder(path.join(root, 'project'))).to.equal(path.join(root, 'project'));
	});

	test('skips build, dependency and tool folders', async () => {
		createTree(['project/node_modules/test/', 'project/target/test/', 'project/.citrus-jbang/test/', 'project/.git/tests/']);

		expect(await TestFolderResolver.resolveTestFolder(path.join(root, 'project'))).to.equal(path.join(root, 'project'));
	});

	test('skips a file named like a test folder', async () => {
		createTree(['project/test', 'project/docs/']);

		expect(await TestFolderResolver.resolveTestFolder(path.join(root, 'project'))).to.equal(path.join(root, 'project'));
	});

	test('falls back to the base folder when it cannot be read', async () => {
		const missing = path.join(root, 'missing');

		expect(await TestFolderResolver.resolveTestFolder(missing)).to.equal(missing);
	});
});
