import { JSON_VALIDATOR_COMPONENT_NAME, VALIDATOR_COMPONENT_NAME } from './is-datamapper';
import { isJsonValidatorComponent, isValidatorComponent } from './is-validator-component';

describe('isValidatorComponent', () => {
  it.each([
    [false, { to: 'mock' }],
    [false, { toD: 'mock' }],
    [false, {}],
    [false, { to: { uri: undefined } }],
    [false, { to: { uri: 'json-validator:schema.json' } }],
    [false, { to: { uri: 'xslt-saxon:doc.xsl' } }],
    [true, { to: { uri: `${VALIDATOR_COMPONENT_NAME}` } }],
    [true, { to: { uri: `${VALIDATOR_COMPONENT_NAME}:ShipOrder.xsd` } }],
  ] as const)('should return %s when toDefinition is %s', (result, toDefinition) => {
    expect(isValidatorComponent(toDefinition)).toBe(result);
  });
});

describe('isJsonValidatorComponent', () => {
  it.each([
    [false, { to: 'mock' }],
    [false, { toD: 'mock' }],
    [false, {}],
    [false, { to: { uri: undefined } }],
    [false, { to: { uri: 'validator:ShipOrder.xsd' } }],
    [false, { to: { uri: 'xslt-saxon:doc.xsl' } }],
    [true, { to: { uri: `${JSON_VALIDATOR_COMPONENT_NAME}` } }],
    [true, { to: { uri: `${JSON_VALIDATOR_COMPONENT_NAME}:schema.json` } }],
  ] as const)('should return %s when toDefinition is %s', (result, toDefinition) => {
    expect(isJsonValidatorComponent(toDefinition)).toBe(result);
  });
});
