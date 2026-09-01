import { expect } from 'chai';
import { ApicurioRegistryParseError, ApicurioRegistryService, ApicurioRegistryUrlError, type ApicurioArtifact } from '../../services/ApicurioRegistryService';

suite('ApicurioRegistryService', function () {
	let service: ApicurioRegistryService;

	setup(function () {
		service = new ApicurioRegistryService();
	});

	suite('detectApiVersion', function () {
		test('should detect v3 from standard URL', function () {
			expect(service.detectApiVersion('https://registry.example.com/apis/registry/v3')).to.equal('v3');
		});

		test('should detect v3 from URL with trailing slash', function () {
			expect(service.detectApiVersion('https://registry.example.com/apis/registry/v3/')).to.equal('v3');
		});

		test('should detect v2 from standard URL', function () {
			expect(service.detectApiVersion('https://registry.example.com/apis/registry/v2')).to.equal('v2');
		});

		test('should detect v2 from URL with trailing slash', function () {
			expect(service.detectApiVersion('https://registry.example.com/apis/registry/v2/')).to.equal('v2');
		});

		test('should detect v3 from localhost URL', function () {
			expect(service.detectApiVersion('http://localhost:8080/apis/registry/v3')).to.equal('v3');
		});

		test('should detect v2 from localhost URL', function () {
			expect(service.detectApiVersion('http://localhost:8080/apis/registry/v2')).to.equal('v2');
		});

		test('should throw ApicurioRegistryUrlError for URL without version', function () {
			try {
				service.detectApiVersion('https://registry.example.com/apis/registry');
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).to.be.instanceOf(ApicurioRegistryUrlError);
				expect((error as Error).message).to.include('Unable to detect API version');
			}
		});

		test('should throw ApicurioRegistryUrlError for invalid URL', function () {
			try {
				service.detectApiVersion('not-a-url');
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).to.be.instanceOf(ApicurioRegistryUrlError);
				expect((error as Error).message).to.include('Invalid URL');
			}
		});

		test('should throw ApicurioRegistryUrlError for empty string', function () {
			try {
				service.detectApiVersion('');
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).to.be.instanceOf(ApicurioRegistryUrlError);
			}
		});

		test('should not match v3 as part of a longer segment', function () {
			try {
				service.detectApiVersion('https://registry.example.com/apis/registry/v31');
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).to.be.instanceOf(ApicurioRegistryUrlError);
				expect((error as Error).message).to.include('Unable to detect API version');
			}
		});

		test('should prefer v3 when URL contains both v2 and v3', function () {
			expect(service.detectApiVersion('https://registry.example.com/v2/apis/registry/v3')).to.equal('v3');
		});
	});

	suite('buildSearchUrl', function () {
		test('should build v3 search URL with artifactType filter', function () {
			const url = service.buildSearchUrl('https://registry.example.com/apis/registry/v3');
			expect(url).to.equal('https://registry.example.com/apis/registry/v3/search/artifacts?artifactType=OPENAPI&limit=100');
		});

		test('should build v2 search URL without type filter', function () {
			const url = service.buildSearchUrl('https://registry.example.com/apis/registry/v2');
			expect(url).to.equal('https://registry.example.com/apis/registry/v2/search/artifacts?limit=100');
		});

		test('should strip trailing slashes before building URL', function () {
			const url = service.buildSearchUrl('https://registry.example.com/apis/registry/v3///');
			expect(url).to.equal('https://registry.example.com/apis/registry/v3/search/artifacts?artifactType=OPENAPI&limit=100');
		});

		test('should use custom limit', function () {
			const url = service.buildSearchUrl('https://registry.example.com/apis/registry/v3', 50);
			expect(url).to.include('limit=50');
		});

		test('should use default limit of 100', function () {
			const url = service.buildSearchUrl('https://registry.example.com/apis/registry/v3');
			expect(url).to.include('limit=100');
		});

		test('should throw for invalid URL', function () {
			try {
				service.buildSearchUrl('not-a-url');
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).to.be.instanceOf(ApicurioRegistryUrlError);
			}
		});
	});

	suite('parseSearchResponse - v3', function () {
		test('should parse v3 response with artifactId and artifactType', function () {
			const response = JSON.stringify({
				count: 2,
				artifacts: [
					{ artifactId: 'openapi-1', artifactType: 'OPENAPI', owner: '' },
					{ artifactId: 'openapi-2', artifactType: 'OPENAPI', groupId: 'my-group', name: 'My API' },
				],
			});

			const result = service.parseSearchResponse(response, 'v3');

			expect(result).to.have.length(2);
			expect(result[0].artifactId).to.equal('openapi-1');
			expect(result[0].groupId).to.be.undefined;
			expect(result[1].artifactId).to.equal('openapi-2');
			expect(result[1].groupId).to.equal('my-group');
			expect(result[1].name).to.equal('My API');
		});

		test('should handle v3 response with null groupId', function () {
			const response = JSON.stringify({
				artifacts: [{ artifactId: 'test-api', artifactType: 'OPENAPI', groupId: null }],
			});

			const result = service.parseSearchResponse(response, 'v3');

			expect(result).to.have.length(1);
			expect(result[0].groupId).to.be.undefined;
		});

		test('should handle v3 response with null name and description', function () {
			const response = JSON.stringify({
				artifacts: [{ artifactId: 'test-api', artifactType: 'OPENAPI', name: null, description: null }],
			});

			const result = service.parseSearchResponse(response, 'v3');

			expect(result).to.have.length(1);
			expect(result[0].name).to.be.undefined;
			expect(result[0].description).to.be.undefined;
		});

		test('should skip v3 entries without artifactId', function () {
			const response = JSON.stringify({
				artifacts: [{ artifactType: 'OPENAPI' }, { artifactId: 'valid', artifactType: 'OPENAPI' }],
			});

			const result = service.parseSearchResponse(response, 'v3');

			expect(result).to.have.length(1);
			expect(result[0].artifactId).to.equal('valid');
		});

		test('should not filter by type for v3 (server already filters)', function () {
			const response = JSON.stringify({
				artifacts: [
					{ artifactId: 'openapi-spec', artifactType: 'OPENAPI' },
					{ artifactId: 'avro-schema', artifactType: 'AVRO' },
				],
			});

			const result = service.parseSearchResponse(response, 'v3');

			expect(result).to.have.length(2);
		});
	});

	suite('parseSearchResponse - v2', function () {
		test('should parse v2 response with id and type fields', function () {
			const response = JSON.stringify({
				count: 1,
				artifacts: [{ id: 'my-openapi', type: 'OPENAPI', createdBy: '', state: 'ENABLED' }],
			});

			const result = service.parseSearchResponse(response, 'v2');

			expect(result).to.have.length(1);
			expect(result[0].artifactId).to.equal('my-openapi');
		});

		test('should filter non-OPENAPI artifacts in v2 response', function () {
			const response = JSON.stringify({
				artifacts: [
					{ id: 'openapi-spec', type: 'OPENAPI' },
					{ id: 'avro-schema', type: 'AVRO' },
					{ id: 'protobuf-def', type: 'PROTOBUF' },
					{ id: 'json-schema', type: 'JSON' },
				],
			});

			const result = service.parseSearchResponse(response, 'v2');

			expect(result).to.have.length(1);
			expect(result[0].artifactId).to.equal('openapi-spec');
		});

		test('should handle case-insensitive type matching in v2', function () {
			const response = JSON.stringify({
				artifacts: [{ id: 'my-api', type: 'openapi' }],
			});

			const result = service.parseSearchResponse(response, 'v2');

			expect(result).to.have.length(1);
		});

		test('should skip v2 entries without id', function () {
			const response = JSON.stringify({
				artifacts: [{ type: 'OPENAPI' }, { id: 'valid', type: 'OPENAPI' }],
			});

			const result = service.parseSearchResponse(response, 'v2');

			expect(result).to.have.length(1);
			expect(result[0].artifactId).to.equal('valid');
		});

		test('should prefer artifactId over id if both present', function () {
			const response = JSON.stringify({
				artifacts: [{ artifactId: 'preferred', id: 'fallback', type: 'OPENAPI' }],
			});

			const result = service.parseSearchResponse(response, 'v2');

			expect(result).to.have.length(1);
			expect(result[0].artifactId).to.equal('preferred');
		});
	});

	suite('parseSearchResponse - error handling', function () {
		test('should throw ApicurioRegistryParseError for invalid JSON', function () {
			try {
				service.parseSearchResponse('not json', 'v3');
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).to.be.instanceOf(ApicurioRegistryParseError);
				expect((error as Error).message).to.include('Failed to parse');
			}
		});

		test('should return empty array for response without artifacts field', function () {
			const result = service.parseSearchResponse('{}', 'v3');
			expect(result).to.deep.equal([]);
		});

		test('should return empty array for empty artifacts array', function () {
			const result = service.parseSearchResponse(JSON.stringify({ artifacts: [] }), 'v3');
			expect(result).to.deep.equal([]);
		});

		test('should preserve cause error in ApicurioRegistryParseError', function () {
			try {
				service.parseSearchResponse('{invalid', 'v3');
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).to.be.instanceOf(ApicurioRegistryParseError);
				expect((error as ApicurioRegistryParseError).cause).to.be.instanceOf(SyntaxError);
			}
		});
	});

	suite('buildArtifactContentUrl - v3', function () {
		const v3Base = 'https://registry.example.com/apis/registry/v3';

		test('should build v3 content URL with branch=latest', function () {
			const artifact: ApicurioArtifact = { artifactId: 'my-api' };
			const url = service.buildArtifactContentUrl(v3Base, artifact);
			expect(url).to.equal(`${v3Base}/groups/default/artifacts/my-api/versions/branch=latest/content`);
		});

		test('should use default group when groupId is undefined', function () {
			const artifact: ApicurioArtifact = { artifactId: 'my-api' };
			const url = service.buildArtifactContentUrl(v3Base, artifact);
			expect(url).to.include('/groups/default/');
		});

		test('should use explicit groupId when provided', function () {
			const artifact: ApicurioArtifact = { artifactId: 'my-api', groupId: 'my-group' };
			const url = service.buildArtifactContentUrl(v3Base, artifact);
			expect(url).to.include('/groups/my-group/');
		});

		test('should encode special characters in groupId', function () {
			const artifact: ApicurioArtifact = { artifactId: 'my-api', groupId: 'group with spaces' };
			const url = service.buildArtifactContentUrl(v3Base, artifact);
			expect(url).to.include('/groups/group%20with%20spaces/');
		});

		test('should encode special characters in artifactId', function () {
			const artifact: ApicurioArtifact = { artifactId: 'my api/v1' };
			const url = service.buildArtifactContentUrl(v3Base, artifact);
			expect(url).to.include('/artifacts/my%20api%2Fv1/');
		});
	});

	suite('buildArtifactContentUrl - v2', function () {
		const v2Base = 'https://registry.example.com/apis/registry/v2';

		test('should build v2 content URL without version path', function () {
			const artifact: ApicurioArtifact = { artifactId: 'my-api' };
			const url = service.buildArtifactContentUrl(v2Base, artifact);
			expect(url).to.equal(`${v2Base}/groups/default/artifacts/my-api`);
		});

		test('should not include versions/branch in v2 URL', function () {
			const artifact: ApicurioArtifact = { artifactId: 'my-api' };
			const url = service.buildArtifactContentUrl(v2Base, artifact);
			expect(url).to.not.include('versions');
			expect(url).to.not.include('branch');
		});

		test('should use explicit groupId in v2 URL', function () {
			const artifact: ApicurioArtifact = { artifactId: 'my-api', groupId: 'custom-group' };
			const url = service.buildArtifactContentUrl(v2Base, artifact);
			expect(url).to.include('/groups/custom-group/');
		});
	});

	suite('buildArtifactContentUrl - error handling', function () {
		test('should throw for invalid URL', function () {
			const artifact: ApicurioArtifact = { artifactId: 'my-api' };
			try {
				service.buildArtifactContentUrl('not-a-url', artifact);
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).to.be.instanceOf(ApicurioRegistryUrlError);
			}
		});

		test('should throw for URL without version', function () {
			const artifact: ApicurioArtifact = { artifactId: 'my-api' };
			try {
				service.buildArtifactContentUrl('https://registry.example.com/apis/registry', artifact);
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).to.be.instanceOf(ApicurioRegistryUrlError);
			}
		});
	});

	suite('end-to-end URL flow', function () {
		test('should produce correct URLs for v3 workflow', function () {
			const registryUrl = 'http://localhost:8080/apis/registry/v3/';

			const version = service.detectApiVersion(registryUrl);
			expect(version).to.equal('v3');

			const searchUrl = service.buildSearchUrl(registryUrl);
			expect(searchUrl).to.equal('http://localhost:8080/apis/registry/v3/search/artifacts?artifactType=OPENAPI&limit=100');

			const v3Response = JSON.stringify({
				count: 1,
				artifacts: [{ artifactId: '6eb9264c-bc36-4872-a76f-0e49222d2d5a', artifactType: 'OPENAPI', owner: '' }],
			});
			const artifacts = service.parseSearchResponse(v3Response, version);
			expect(artifacts).to.have.length(1);

			const contentUrl = service.buildArtifactContentUrl(registryUrl, artifacts[0]);
			expect(contentUrl).to.equal(
				'http://localhost:8080/apis/registry/v3/groups/default/artifacts/6eb9264c-bc36-4872-a76f-0e49222d2d5a/versions/branch=latest/content',
			);
		});

		test('should produce correct URLs for v2 workflow', function () {
			const registryUrl = 'http://localhost:8080/apis/registry/v2';

			const version = service.detectApiVersion(registryUrl);
			expect(version).to.equal('v2');

			const searchUrl = service.buildSearchUrl(registryUrl);
			expect(searchUrl).to.equal('http://localhost:8080/apis/registry/v2/search/artifacts?limit=100');

			const v2Response = JSON.stringify({
				count: 2,
				artifacts: [
					{ id: '6eb9264c-bc36-4872-a76f-0e49222d2d5a', type: 'OPENAPI', state: 'ENABLED' },
					{ id: 'some-avro-schema', type: 'AVRO', state: 'ENABLED' },
				],
			});
			const artifacts = service.parseSearchResponse(v2Response, version);
			expect(artifacts).to.have.length(1);
			expect(artifacts[0].artifactId).to.equal('6eb9264c-bc36-4872-a76f-0e49222d2d5a');

			const contentUrl = service.buildArtifactContentUrl(registryUrl, artifacts[0]);
			expect(contentUrl).to.equal('http://localhost:8080/apis/registry/v2/groups/default/artifacts/6eb9264c-bc36-4872-a76f-0e49222d2d5a');
		});
	});
});
