import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { extensions, Uri, workspace } from 'vscode';
import { parse } from 'yaml';
import { NewCamelKameletCommand } from '../../commands/NewCamelKameletCommand';
import { NewCamelPipeCommand } from '../../commands/NewCamelPipeCommand';
import { NewCamelRouteCommand } from '../../commands/NewCamelRouteCommand';
import { StarterTemplateService } from '../../services/StarterTemplateService';
import { expectOpenedInKaoto, readText, useNewFileCommandFixture } from '../utils/NewFileCommandStubs';

suite('New Camel file commands', () => {
	const fixture = useNewFileCommandFixture('new-file-commands');
	const { stubUi } = fixture;
	let service: StarterTemplateService;
	let tempFolders: string[];

	const fileInFolder = (name: string): Uri => Uri.joinPath(fixture.folder, name);

	setup(() => {
		service = StarterTemplateService.forExtension(extensions.getExtension('redhat.vscode-kaoto')!.extensionUri);
		tempFolders = [];
	});

	teardown(() => {
		for (const tempFolder of tempFolders) {
			fs.rmSync(tempFolder, { recursive: true, force: true });
		}
	});

	test('creates a YAML route from the shared template and opens it in Kaoto', async () => {
		const ui = stubUi({ quickPicks: ['YAML'], folder: fixture.folder, fileName: 'orders' });

		await new NewCamelRouteCommand(service).create();

		const file = fileInFolder('orders.camel.yaml');
		expect(parse(await readText(file))[0].route.id).to.match(/^route-[1-9]\d{3}$/);
		expectOpenedInKaoto(ui, file);
	});

	test('creates an XML route from the shared template and opens it in Kaoto', async () => {
		const ui = stubUi({ quickPicks: ['XML'], folder: fixture.folder, fileName: 'orders' });

		await new NewCamelRouteCommand(service).create();

		const file = fileInFolder('orders.camel.xml');
		expect(await readText(file)).to.match(/<route id="route-[1-9]\d{3}">/);
		expectOpenedInKaoto(ui, file);
	});

	test('creates a sink Kamelet named after the file', async () => {
		const ui = stubUi({ quickPicks: ['sink'], folder: fixture.folder, fileName: 'orders' });

		await new NewCamelKameletCommand(service, 'YAML').create();

		const file = fileInFolder('orders-sink.kamelet.yaml');
		const kamelet = parse(await readText(file));
		expect(kamelet.metadata.name).to.equal('orders-sink');
		expect(kamelet.metadata.labels['camel.apache.org/kamelet.type']).to.equal('sink');
		expectOpenedInKaoto(ui, file);
	});

	for (const type of ['source', 'action']) {
		test(`creates a Kamelet from the ${type} template`, async () => {
			const ui = stubUi({ quickPicks: [type], folder: fixture.folder, fileName: 'orders' });

			await new NewCamelKameletCommand(service, 'YAML').create();

			const file = fileInFolder(`orders-${type}.kamelet.yaml`);
			const kamelet = parse(await readText(file));
			expect(kamelet.metadata.name).to.equal(`orders-${type}`);
			expect(kamelet.metadata.labels['camel.apache.org/kamelet.type']).to.equal(type);
			expectOpenedInKaoto(ui, file);
		});
	}

	test('creates a Pipe named after the file', async () => {
		const ui = stubUi({ quickPicks: [], folder: fixture.folder, fileName: 'orders' });

		await new NewCamelPipeCommand(service, 'YAML').create();

		const file = fileInFolder('orders.pipe.yaml');
		expect(parse(await readText(file)).metadata.name).to.equal('orders');
		expectOpenedInKaoto(ui, file);
	});

	test('writes nothing when the name prompt is cancelled', async () => {
		const ui = stubUi({ quickPicks: ['YAML'], folder: fixture.folder, fileName: undefined });

		await new NewCamelRouteCommand(service).create();

		expect(await workspace.fs.readDirectory(fixture.folder)).to.be.empty;
		expect(ui.opened).to.be.empty;
		expect(ui.errors).to.be.empty;
	});

	test('does not overwrite a file that appeared after validation', async () => {
		const existing = fileInFolder('orders.pipe.yaml');
		await workspace.fs.writeFile(existing, new TextEncoder().encode('keep me'));
		const ui = stubUi({ quickPicks: [], folder: fixture.folder, fileName: 'orders' });

		await new NewCamelPipeCommand(service, 'YAML').create();

		expect(await readText(existing)).to.equal('keep me');
		expect(ui.errors).to.have.length(1);
		expect(ui.errors[0]).to.include('already exists');
		expect(ui.opened).to.be.empty;
	});

	test('shows an error and writes nothing when the templates are missing', async () => {
		const emptyCatalog = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-no-templates-'));
		tempFolders.push(emptyCatalog);
		const ui = stubUi({ quickPicks: [], folder: fixture.folder, fileName: 'orders' });

		await new NewCamelPipeCommand(new StarterTemplateService(Uri.file(emptyCatalog)), 'YAML').create();

		expect(await workspace.fs.readDirectory(fixture.folder)).to.be.empty;
		expect(ui.errors).to.have.length(1);
		expect(ui.errors[0]).to.include('index.json');
		expect(ui.opened).to.be.empty;
	});

	test('shows a failure that is not an Error as text', async () => {
		const failure: unknown = 'no space left';
		const failing = { writeStarterFile: () => Promise.reject(failure) } as unknown as StarterTemplateService;
		const ui = stubUi({ quickPicks: [], folder: fixture.folder, fileName: 'orders' });

		await new NewCamelPipeCommand(failing, 'YAML').create();

		expect(ui.errors).to.deep.equal(['Failed to create the new file: no space left']);
		expect(ui.opened).to.be.empty;
	});
});
