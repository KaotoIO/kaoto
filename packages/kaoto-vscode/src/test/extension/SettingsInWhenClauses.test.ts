import { expect } from 'chai';
import { extensions } from 'vscode';

/**
 * A `config.kaoto.*` key in a when or enablement clause reads a Kaoto setting. Once the extension no longer contributes
 * that setting, the key is undefined for everyone who never set it by hand, so whatever the clause guards stays hidden or
 * disabled: the Open UI actions of the Infrastructure view kept `config.kaoto.infrastructure.enabled` after that setting
 * was removed.
 */
suite('Settings in when clauses', () => {
	test('every Kaoto setting that a when or enablement clause reads is a setting of the extension', () => {
		const contributes = extensions.getExtension('redhat.vscode-kaoto')!.packageJSON.contributes;
		const settings = new Set(
			[contributes.configuration].flat().flatMap((section: { properties?: Record<string, unknown> }) => Object.keys(section.properties ?? {})),
		);

		const unknownSettings: string[] = [];
		const collect = (value: unknown, location: string) => {
			if (Array.isArray(value)) {
				value.forEach((item, index) => collect(item, `${location}[${index}]`));
				return;
			}
			if (!value || typeof value !== 'object') {
				return;
			}
			for (const [key, item] of Object.entries(value)) {
				if ((key === 'when' || key === 'enablement') && typeof item === 'string') {
					for (const [, setting] of item.matchAll(/\bconfig\.(kaoto\.[\w.-]+)/g)) {
						if (!settings.has(setting)) {
							unknownSettings.push(`${location}.${key}: ${setting}`);
						}
					}
				} else {
					collect(item, `${location}.${key}`);
				}
			}
		};
		collect(contributes, 'contributes');

		expect(unknownSettings).to.deep.equal([]);
	});
});
