import { expect } from 'chai';
import { extensions } from 'vscode';

/** The parts of the extension's `contributes` section that these tests read. */
interface Contributes {
	menus: { 'view/title': { submenu?: string; when?: string }[] };
	viewsWelcome: { view: string; contents: string; when?: string }[];
}

/**
 * Creating a route, Kamelet or Pipe renders a bundled starter template and needs no Camel JBang, so no entry point for
 * it in the Integrations view may wait for `kaoto.executorAvailable`. They wait for `kaoto.newFileCommandsAvailable` instead: the Node
 * extension host sets that key when it registers the commands, and the web worker, which registers none of them, never does.
 */
suite('New-file entry points', () => {
	let contributes: Contributes;

	suiteSetup(() => {
		contributes = extensions.getExtension('redhat.vscode-kaoto')!.packageJSON.contributes;
	});

	/** The one entry that matches. A missing or duplicated entry fails here, not later as a confusing `undefined`. */
	const single = <T>(entries: T[], description: string): T => {
		expect(entries, description).to.have.length(1);
		return entries[0];
	};

	test('the New File submenu of the Integrations view is shown without Camel JBang', () => {
		const entry = single(
			contributes.menus['view/title'].filter((item) => item.submenu === 'kaoto.new.file'),
			'view/title entries of the kaoto.new.file submenu',
		);

		expect(entry.when).to.equal('view == kaoto.integrations && !virtualWorkspace && kaoto.newFileCommandsAvailable && workspaceFolderCount > 0');
	});

	test('the welcome content of the Integrations view offers a new Camel file without Camel JBang', () => {
		const entry = single(
			contributes.viewsWelcome.filter((item) => item.view === 'kaoto.integrations' && item.contents.includes('command:kaoto.new.camel.file')),
			'kaoto.integrations welcome content that links to the kaoto.new.camel.file command',
		);

		expect(entry.when).to.equal('!virtualWorkspace && kaoto.newFileCommandsAvailable && workspaceFolderCount > 0');
	});

	// Whether the extension host sets kaoto.newFileCommandsAvailable is checked end to end by the UI test
	// 03_IntegrationsViewNewFile: its 'New File...' button only shows when the key is set.
});
