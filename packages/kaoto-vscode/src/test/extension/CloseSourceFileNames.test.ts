import { expect } from 'chai';
import { extensions } from 'vscode';

/** The parts of the extension's `contributes` section that this test reads. */
interface Contributes {
	customEditors: { viewType: string; selector: { filenamePattern: string }[] }[];
	commands: { command: string; enablement?: string }[];
	menus: { 'editor/title': { command?: string; when?: string }[] };
}

/** Expands the braces of a file name pattern: `*{.camel,.kamelet}.{yaml,yml}` gives `*.camel.yaml`, `*.camel.yml`, `*.kamelet.yaml` and `*.kamelet.yml`. */
const expandBraces = (pattern: string): string[] => {
	const group = /\{([^{}]*)\}/.exec(pattern);
	if (!group) {
		return [pattern];
	}
	const head = pattern.slice(0, group.index);
	const tail = pattern.slice(group.index + group[0].length);
	return group[1].split(',').flatMap((option) => expandBraces(head + option + tail));
};

/** The regular expressions of the `resourceFilename =~ /.../` alternatives of a when or enablement clause. */
const fileNameRegExps = (clause: string): RegExp[] => [...clause.matchAll(/resourceFilename =~ \/(.+?)\/(?=[\s)])/g)].map(([, source]) => new RegExp(source));

/**
 * Close Source closes the text editor that Open Source puts next to the Kaoto editor. Its enablement and its editor title
 * entry test the file name, so they must accept every file name the Kaoto editor opens: the Kaoto editor opened `.yml`
 * routes, Kamelets and Pipes, which Close Source never accepted.
 */
suite('Close Source file names', () => {
	let contributes: Contributes;

	suiteSetup(() => {
		contributes = extensions.getExtension('redhat.vscode-kaoto')!.packageJSON.contributes;
	});

	test('Close Source is offered for every file the Kaoto editor opens', () => {
		const kaotoEditor = contributes.customEditors.find((editor) => editor.viewType === 'webviewEditorsKaoto')!;
		const fileNames = kaotoEditor.selector.flatMap(({ filenamePattern }) => expandBraces(filenamePattern)).map((pattern) => pattern.replace('*', 'route'));

		const clauses = {
			enablement: contributes.commands.find((command) => command.command === 'kaoto.close.source')!.enablement!,
			'editor/title': contributes.menus['editor/title'].find((entry) => entry.command === 'kaoto.close.source')!.when!,
		};
		for (const [location, clause] of Object.entries(clauses)) {
			const regExps = fileNameRegExps(clause);
			expect(
				fileNames.filter((fileName) => !regExps.some((regExp) => regExp.test(fileName))),
				location,
			).to.deep.equal([]);
		}
	});
});
