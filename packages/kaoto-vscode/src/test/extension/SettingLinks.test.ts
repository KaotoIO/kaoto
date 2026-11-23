import { expect } from 'chai';
import { extensions } from 'vscode';

/**
 * A setting description links to another setting with `#setting.id#`. A link to a setting that the extension no longer
 * contributes leads nowhere: two executor settings kept linking to `kaoto.camelVersion` after the Camel version moved to
 * the catalog selected in `kaoto.runtimeCatalogName`.
 */
suite('Setting links', () => {
	test('every Kaoto setting that a setting description links to is a setting of the extension', () => {
		const contributes = extensions.getExtension('redhat.vscode-kaoto')!.packageJSON.contributes;
		const settings: Record<string, unknown> = Object.assign(
			{},
			...[contributes.configuration].flat().map((section: { properties?: Record<string, unknown> }) => section.properties ?? {}),
		);

		const deadLinks = Object.entries(settings).flatMap(([setting, schema]) =>
			[...JSON.stringify(schema).matchAll(/#(kaoto\.[\w.-]+)#/g)].filter(([, link]) => !(link in settings)).map(([, link]) => `${setting}: ${link}`),
		);

		expect(deadLinks).to.deep.equal([]);
	});
});
