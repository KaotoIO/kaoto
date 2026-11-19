import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { AbstractCamelCommand } from '../../commands/AbstractCamelCommand';
import { getTestWorkspaceFolder } from '../utils/TestSetup';

/** A command the way the Camel file commands extend AbstractCamelCommand */
class CamelFileCommand extends AbstractCamelCommand {
	withoutWorkspaceFolder(): this {
		this.singleWorkspaceFolder = undefined;
		return this;
	}
}

suite('AbstractCamelCommand file name validation', () => {
	const createdFiles: string[] = [];

	const createWorkspaceFile = (relativePath: string) => {
		const filePath = path.join(getTestWorkspaceFolder(), relativePath);
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, '');
		createdFiles.push(filePath);
		return filePath;
	};

	teardown(() => {
		while (createdFiles.length > 0) {
			fs.rmSync(createdFiles.pop()!, { force: true });
		}
	});

	test('accepts a new name', async () => {
		expect(await new CamelFileCommand('YAML').validateCamelFileName('brand-new-route')).to.equal(undefined);
	});

	for (const [description, name, message] of [
		['an empty name', '', 'Please provide a name for the new file (without extension).'],
		['a name with an extension', 'route.camel', 'Please provide a name without the extension.'],
		['a name with characters a file name cannot have', 'route?name', 'The filename is invalid.'],
	]) {
		test(`rejects ${description}`, async () => {
			expect(await new CamelFileCommand('YAML').validateCamelFileName(name)).to.equal(message);
		});
	}

	for (const [dsl, extension] of [
		['YAML', 'camel.yaml'],
		['XML', 'camel.xml'],
	]) {
		test(`rejects the name of an existing ${dsl} route in the workspace`, async () => {
			createWorkspaceFile(`existing-route.${extension}`);

			expect(await new CamelFileCommand(dsl).validateCamelFileName('existing-route')).to.equal(
				'The file already exists. Please choose a different file name.',
			);
		});
	}

	test('looks for an existing file in the given folder', async () => {
		const existing = createWorkspaceFile(path.join('routes', 'nested-route.camel.yaml'));
		const command = new CamelFileCommand('YAML');

		expect(await command.validateCamelFileName('nested-route', path.dirname(existing))).to.equal(
			'The file already exists. Please choose a different file name.',
		);
		expect(await command.validateCamelFileName('nested-route')).to.equal(undefined);
	});

	test('asks to open a workspace folder first', async () => {
		expect(await new CamelFileCommand('YAML').withoutWorkspaceFolder().validateCamelFileName('route')).to.equal('Please open a workspace folder first.');
	});

	test('fails for a command without a Camel DSL', async () => {
		let error: Error | undefined;
		await new CamelFileCommand().validateCamelFileName('route').catch((e: Error) => (error = e));

		expect(error?.message).to.equal('Camel DSL cannot be undefined.');
	});
});
