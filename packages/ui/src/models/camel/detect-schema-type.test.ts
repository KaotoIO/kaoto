import { CamelResourceFactory } from './camel-resource-factory';
import { detectSchemaType } from './detect-schema-type';
import { SourceSchemaType } from './source-schema-type';

const ROUTE_YAML = `
- route:
    id: demo-route
    from:
      uri: timer:hello
      steps:
        - log: hello
`;

const KAMELET_YAML = `
apiVersion: camel.apache.org/v1
kind: Kamelet
metadata:
  name: my-kamelet
spec: {}
`;

const PIPE_YAML = `
apiVersion: camel.apache.org/v1
kind: Pipe
metadata:
  name: my-pipe
`;

const INTEGRATION_YAML = `
apiVersion: camel.apache.org/v1
kind: Integration
metadata:
  name: my-integration
`;

const KAMELET_BINDING_YAML = `
apiVersion: camel.apache.org/v1alpha1
kind: KameletBinding
metadata:
  name: my-binding
`;

const CITRUS_YAML = `
name: sample-test
actions:
  - echo:
      message: hello
`;

const XML_ROUTE = `<camel>
  <route id="demo-route">
    <from uri="timer:hello"/>
    <log message="hello"/>
  </route>
</camel>`;

describe('detectSchemaType', () => {
  describe('parity with CamelResourceFactory', () => {
    const cases: Array<{ name: string; source?: string; path?: string }> = [
      { name: 'empty source, no path', source: '', path: undefined },
      { name: 'empty source, .kamelet.yaml path', source: '', path: 'foo.kamelet.yaml' },
      { name: 'empty source, .pipe.yaml path', source: '', path: 'foo.pipe.yaml' },
      { name: 'empty source, .integration.yaml path', source: '', path: 'foo.integration.yaml' },
      { name: 'empty source, .kamelet-binding.yaml path', source: '', path: 'foo.kamelet-binding.yaml' },
      { name: 'empty source, .citrus.yaml path', source: '', path: 'foo.citrus.yaml' },
      { name: 'empty source, .yaml path', source: '', path: 'foo.yaml' },
      { name: 'route yaml, no path', source: ROUTE_YAML, path: undefined },
      { name: 'kamelet yaml, no path', source: KAMELET_YAML, path: undefined },
      { name: 'pipe yaml, no path', source: PIPE_YAML, path: undefined },
      { name: 'integration yaml, no path', source: INTEGRATION_YAML, path: undefined },
      { name: 'kamelet-binding yaml, no path', source: KAMELET_BINDING_YAML, path: undefined },
      { name: 'citrus yaml, no path', source: CITRUS_YAML, path: undefined },
      { name: 'xml route, no path', source: XML_ROUTE, path: undefined },
      { name: 'xml route, .xml path', source: XML_ROUTE, path: 'foo.xml' },
    ];

    for (const testCase of cases) {
      it(testCase.name, () => {
        const factoryType = CamelResourceFactory.createCamelResource(testCase.source, {
          path: testCase.path,
        }).getType();
        const detectedType = detectSchemaType(testCase.source, testCase.path);
        expect(detectedType).toEqual(factoryType);
      });
    }
  });

  it('returns Route for undefined source and no path', () => {
    expect(detectSchemaType()).toEqual(SourceSchemaType.Route);
  });

  it('prefers path-based Test detection over content', () => {
    expect(detectSchemaType(ROUTE_YAML, 'foo.citrus.yaml')).toEqual(SourceSchemaType.Test);
  });

  it('falls back to content-based Citrus detection when path is ambiguous', () => {
    expect(detectSchemaType(CITRUS_YAML, 'foo.yaml')).toEqual(SourceSchemaType.Test);
  });
});
