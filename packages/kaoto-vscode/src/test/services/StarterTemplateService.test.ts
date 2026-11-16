import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { XMLParser } from 'fast-xml-parser';
import { parse } from 'yaml';
import { StarterTemplateId } from '@kaoto/camel-catalog/types';
import { KAOTO_ID_TOKEN, randomKaotoId, resolveKaotoIds, StarterTemplateService } from '../../services/StarterTemplateService';

/** The starter templates of the integration files: routes, Kamelets and Pipes. */
const INTEGRATION_TEMPLATE_IDS: StarterTemplateId[] = [
	'camel-route-yaml',
	'camel-route-xml',
	'pipe-yaml',
	'kamelet-source-yaml',
	'kamelet-action-yaml',
	'kamelet-sink-yaml',
];

const KAMELET_TYPES = ['source', 'action', 'sink'] as const;

/** A function that hands out the given values one by one, in order. */
const sequence = (...values: string[]) => {
	const queue = [...values];
	return () => queue.shift() as string;
};

/** Resolves with the error a promise rejects with; fails when it resolves. */
const rejectionOf = async (promise: Promise<unknown>): Promise<Error> => {
	try {
		await promise;
	} catch (error) {
		expect(error).to.be.instanceOf(Error);
		return error as Error;
	}
	return expect.fail('Expected the promise to reject');
};

suite('StarterTemplateService', () => {
	let service: StarterTemplateService;
	let tempFolders: string[];
	let realFs: vscode.FileSystem;

	const template = (id: StarterTemplateId) => service.getTemplate(id);

	/**
	 * Routes the given members of `vscode.workspace.fs` to stubs while every other member still reaches the real file
	 * system. The object is frozen, so its members cannot be redefined one by one: it is replaced as a whole by a copy.
	 * The teardown puts the original back.
	 */
	const stubFs = (members: Partial<vscode.FileSystem>): void => {
		Object.defineProperty(vscode.workspace, 'fs', { value: { ...realFs, ...members }, configurable: true });
	};

	const makeTempFolder = (): string => {
		const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-starter-'));
		tempFolders.push(folder);
		return folder;
	};

	/** Writes the given files into a catalog folder, keyed by their path inside the catalog. */
	const writeCatalogFiles = (root: string, files: Record<string, string>): void => {
		for (const [relativePath, content] of Object.entries(files)) {
			const file = path.join(root, relativePath);
			fs.mkdirSync(path.dirname(file), { recursive: true });
			fs.writeFileSync(file, content);
		}
	};

	/** A service over a temporary catalog made of the given files, keyed by their path inside the catalog. */
	const catalogWith = (files: Record<string, string>): StarterTemplateService => {
		const root = makeTempFolder();
		writeCatalogFiles(root, files);
		return new StarterTemplateService(vscode.Uri.file(root));
	};

	setup(() => {
		const extension = vscode.extensions.getExtension('redhat.vscode-kaoto')!;
		service = StarterTemplateService.forExtension(extension.extensionUri);
		tempFolders = [];
		realFs = vscode.workspace.fs;
	});

	teardown(() => {
		Object.defineProperty(vscode.workspace, 'fs', { value: realFs, configurable: true });
		for (const folder of tempFolders) {
			fs.rmSync(folder, { recursive: true, force: true });
		}
	});

	test('reads every integration starter template through the manifest', async () => {
		for (const id of INTEGRATION_TEMPLATE_IDS) {
			const text = await template(id);
			expect(text, id).to.be.a('string').and.not.be.empty;
		}
		expect(await template('camel-route-yaml')).to.include('id: route-__KAOTO_ID__');
	});

	test('rejects when the catalog has no index.json', async () => {
		const error = await rejectionOf(catalogWith({}).getTemplate('pipe-yaml'));

		expect(error.message).to.include('index.json');
	});

	test('rejects when index.json lists no starter templates', async () => {
		const error = await rejectionOf(catalogWith({ 'index.json': '{}' }).getTemplate('pipe-yaml'));

		expect(error.message).to.include('starterTemplates');
	});

	test('rejects when the manifest has no entry for the template', async () => {
		const catalog = catalogWith({
			'index.json': '{"starterTemplates":"starter-templates/index.json"}',
			'starter-templates/index.json': '{"catalogs":{}}',
		});

		const error = await rejectionOf(catalog.getTemplate('pipe-yaml'));

		expect(error.message).to.include('pipe-yaml');
	});

	test('rejects when the template file is missing', async () => {
		const catalog = catalogWith({
			'index.json': '{"starterTemplates":"starter-templates/index.json"}',
			'starter-templates/index.json': '{"catalogs":{"pipe-yaml":{"file":"missing.yaml"}}}',
		});

		const error = await rejectionOf(catalog.getTemplate('pipe-yaml'));

		expect(error.message).to.include('missing.yaml');
	});

	test('names a read failure that is not an Error', async () => {
		const failure: unknown = 'device not ready';
		stubFs({ readFile: () => Promise.reject(failure) });

		const error = await rejectionOf(service.getTemplate('camel-route-yaml'));

		expect(error.message).to.include('the catalog index').and.include('device not ready');
	});

	test('reads the catalog again after a failed load instead of caching the failure', async () => {
		const root = makeTempFolder();
		const catalog = new StarterTemplateService(vscode.Uri.file(root));
		await rejectionOf(catalog.getTemplate('pipe-yaml'));

		writeCatalogFiles(root, {
			'index.json': '{"starterTemplates":"starter-templates/index.json"}',
			'starter-templates/index.json': '{"catalogs":{"pipe-yaml":{"file":"pipe.yaml"}}}',
			'starter-templates/pipe.yaml': 'kind: Pipe\n',
		});

		expect(await catalog.getTemplate('pipe-yaml')).to.equal('kind: Pipe\n');
	});

	test('gives each token occurrence its own id', () => {
		expect(resolveKaotoIds('a-__KAOTO_ID__ b-__KAOTO_ID__', sequence('1111', '2222'))).to.equal('a-1111 b-2222');
	});

	test('draws ids from 1000 to 9999', () => {
		for (let i = 0; i < 200; i++) {
			expect(randomKaotoId()).to.match(/^[1-9]\d{3}$/);
		}
	});

	test('renders route YAML with a generated route id', async () => {
		const rendered = await service.renderTemplate('camel-route-yaml');
		const id: string = parse(rendered)[0].route.id;

		expect(id).to.match(/^route-[1-9]\d{3}$/);
		expect(rendered).to.equal((await template('camel-route-yaml')).replace(KAOTO_ID_TOKEN, id.slice(6)));
	});

	test('renders route YAML with its steps under from', async () => {
		const route = parse(await service.renderTemplate('camel-route-yaml'))[0].route;

		expect(route, 'route').to.not.have.property('steps');
		expect(route.from.steps, 'from.steps').to.be.an('array').that.is.not.empty;
	});

	test('renders route XML with a generated route id', async () => {
		const rendered = await service.renderTemplate('camel-route-xml');
		const id = /<route id="(route-[1-9]\d{3})">/.exec(rendered)?.[1];

		expect(id).to.not.be.undefined;
		expect(rendered).to.equal((await template('camel-route-xml')).replace(KAOTO_ID_TOKEN, id!.slice(6)));
		expect(new XMLParser({ ignoreAttributes: false }).parse(rendered).routes.route['@_id']).to.equal(id);
	});

	for (const type of KAMELET_TYPES) {
		test(`sets the Kamelet name from the file name (${type})`, async () => {
			const id = `kamelet-${type}-yaml` as const;

			const rendered = await service.renderTemplate(id, `orders-${type}`);

			expect(parse(rendered).metadata.name).to.equal(`orders-${type}`);
			expect(rendered).to.equal((await template(id)).replace(`name: kamelet-${type}-__KAOTO_ID__`, `name: orders-${type}`));
		});
	}

	test('sets the Pipe name from the file name', async () => {
		const rendered = await service.renderTemplate('pipe-yaml', 'orders');

		expect(parse(rendered).metadata.name).to.equal('orders');
		expect(rendered).to.equal((await template('pipe-yaml')).replace('name: pipe-__KAOTO_ID__', 'name: orders'));
	});

	test('keeps names that look like numbers or booleans as strings', async () => {
		for (const name of ['123', 'true', 'null']) {
			expect(parse(await service.renderTemplate('pipe-yaml', name)).metadata.name).to.equal(name);
		}
	});

	test('keeps names with YAML-special characters intact', async () => {
		for (const name of ['orders #1', '&orders', '*orders']) {
			expect(parse(await service.renderTemplate('pipe-yaml', name)).metadata.name).to.equal(name);
		}
	});

	test('keeps non-ASCII names intact', async () => {
		expect(parse(await service.renderTemplate('kamelet-sink-yaml', 'objednávky-sink')).metadata.name).to.equal('objednávky-sink');
	});

	test('keeps a name that contains the id token as the user typed it', async () => {
		expect(parse(await service.renderTemplate('pipe-yaml', '__KAOTO_ID__')).metadata.name).to.equal('__KAOTO_ID__');
		expect(parse(await service.renderTemplate('kamelet-sink-yaml', '__KAOTO_ID__-sink')).metadata.name).to.equal('__KAOTO_ID__-sink');
	});

	test('keeps long lines of the template as they are', async () => {
		const pipe = [
			'apiVersion: camel.apache.org/v1',
			'kind: Pipe',
			'metadata:',
			'  name: pipe-__KAOTO_ID__',
			'spec:',
			'  description: A deliberately long description that runs well past the eighty columns a YAML stringifier folds lines at by default',
			'',
		].join('\n');
		const catalog = catalogWith({
			'index.json': '{"starterTemplates":"starter-templates/index.json"}',
			'starter-templates/index.json': '{"catalogs":{"pipe-yaml":{"file":"pipe.yaml"}}}',
			'starter-templates/pipe.yaml': pipe,
		});

		expect(await catalog.renderTemplate('pipe-yaml', 'orders')).to.equal(pipe.replace('name: pipe-__KAOTO_ID__', 'name: orders'));
	});

	test('never leaves a token in any rendered integration template', async () => {
		for (const id of INTEGRATION_TEMPLATE_IDS) {
			expect(await service.renderTemplate(id, 'orders'), id).to.not.include(KAOTO_ID_TOKEN);
		}
	});

	test('writeStarterFile creates missing folders and writes the rendered text', async () => {
		const target = vscode.Uri.file(path.join(makeTempFolder(), 'a', 'b', 'orders.pipe.yaml'));

		await service.writeStarterFile('pipe-yaml', target, 'orders');

		expect(fs.existsSync(target.fsPath)).to.equal(true);
		expect(parse(fs.readFileSync(target.fsPath, 'utf8')).metadata.name).to.equal('orders');
	});

	test('writeStarterFile never overwrites an existing file', async () => {
		const target = path.join(makeTempFolder(), 'orders.pipe.yaml');
		fs.writeFileSync(target, 'keep me');

		await rejectionOf(service.writeStarterFile('pipe-yaml', vscode.Uri.file(target), 'orders'));

		expect(fs.readFileSync(target, 'utf8')).to.equal('keep me');
	});

	test('writeStarterFile writes nothing when it cannot tell whether the target exists', async () => {
		const target = path.join(makeTempFolder(), 'orders.pipe.yaml');
		const failure = vscode.FileSystemError.NoPermissions(vscode.Uri.file(target));
		let writes = 0;
		stubFs({
			stat: () => Promise.reject(failure),
			writeFile: () => {
				writes++;
				return Promise.resolve();
			},
		});

		expect(await rejectionOf(service.writeStarterFile('pipe-yaml', vscode.Uri.file(target), 'orders'))).to.equal(failure);
		expect(writes, 'writes').to.equal(0);
		expect(fs.existsSync(target)).to.equal(false);
	});

	test('writeStarterFile removes the partly written file when the write fails', async () => {
		const target = path.join(makeTempFolder(), 'a', 'orders.pipe.yaml');
		const failure = new Error('disk full');
		stubFs({
			writeFile: async (uri, content) => {
				await realFs.writeFile(uri, content.slice(0, 8));
				throw failure;
			},
		});

		const error = await rejectionOf(service.writeStarterFile('pipe-yaml', vscode.Uri.file(target), 'orders'));

		expect(error).to.equal(failure);
		expect(fs.existsSync(target)).to.equal(false);
		expect(fs.existsSync(path.dirname(target)), 'the folder created for the file').to.equal(true);
	});

	test('writeStarterFile reports the failed write even when removing the partly written file fails too', async () => {
		const target = vscode.Uri.file(path.join(makeTempFolder(), 'orders.pipe.yaml'));
		const failure = new Error('disk full');
		stubFs({
			writeFile: async () => {
				throw failure;
			},
			delete: async () => {
				throw new Error('cannot delete');
			},
		});

		expect(await rejectionOf(service.writeStarterFile('pipe-yaml', target, 'orders'))).to.equal(failure);
	});
});
