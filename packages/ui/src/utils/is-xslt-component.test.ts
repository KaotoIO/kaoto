import { XSLT_COMPONENT_NAME } from './is-datamapper';
import { isXSLTComponent } from './is-xslt-component';

describe('isXSLTComponent', () => {
  it.each([
    [false, { to: 'mock' }],
    [false, { toD: 'mock' }],
    [false, {}],
    [false, { to: { uri: undefined } }],
    [false, { to: { uri: 'timer:myTimer' } }],
    [true, { to: { uri: `${XSLT_COMPONENT_NAME}` } }],
    [true, { to: { uri: `${XSLT_COMPONENT_NAME}:document.xsl` } }],
  ] as const)('should return %s when toDefinition is %s', (result, toDefinition) => {
    expect(isXSLTComponent(toDefinition)).toBe(result);
  });
});
