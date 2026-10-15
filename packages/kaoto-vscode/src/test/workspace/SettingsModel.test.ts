import { SettingsModel } from '@kaoto/kaoto/models';
import { assert } from 'chai';

suite('Workspace runtime imports', () => {
	test('constructs settings from the Kaoto workspace with defaults and overrides', () => {
		const settings = new SettingsModel({
			catalogUrl: 'https://example.com/catalog.json',
			rest: { apicurioRegistryUrl: 'https://example.com/registry', customMediaTypes: ['application/example'] },
		});

		assert.equal(settings.catalogUrl, 'https://example.com/catalog.json');
		assert.equal(settings.nodeLabel, 'description');
		assert.deepEqual(settings.rest, {
			apicurioRegistryUrl: 'https://example.com/registry',
			customMediaTypes: ['application/example'],
		});
	});
});
