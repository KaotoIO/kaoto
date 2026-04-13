import { IField } from '../../../../models/datamapper/document';
import { FieldOverrideVariant, Types } from '../../../../models/datamapper/types';
import { QName } from '../../../../xml-schema-ts/QName';
import { getOverrideDisplayInfo } from './override-util';

const NS = 'http://www.w3.org/2001/XMLSchema';

function createField(overrides: Partial<IField> = {}): IField {
  return {
    name: 'fieldA',
    displayName: 'fieldA',
    type: Types.String,
    typeQName: new QName(NS, 'string'),
    typeOverride: FieldOverrideVariant.NONE,
    ...overrides,
  } as IField;
}

describe('getOverrideDisplayInfo', () => {
  const namespaceMap = { xs: NS };

  it('should return null when field has no override', () => {
    const field = createField();
    expect(getOverrideDisplayInfo(field, namespaceMap)).toBeNull();
  });

  it('should return type override display info for SAFE variant', () => {
    const field = createField({
      typeOverride: FieldOverrideVariant.SAFE,
      typeQName: new QName(NS, 'int'),
      originalField: {
        name: 'fieldA',
        displayName: 'fieldA',
        namespaceURI: null,
        namespacePrefix: null,
        type: Types.String,
        typeQName: new QName(NS, 'string'),
        namedTypeFragmentRefs: [],
      },
    });

    const result = getOverrideDisplayInfo(field, namespaceMap);
    expect(result).not.toBeNull();
    expect(result!.originalLabel).toBe('Original type');
    expect(result!.currentLabel).toBe('Overridden type');
    expect(result!.original).toBe('xs:string');
    expect(result!.current).toBe('xs:int');
  });

  it('should return substitution display info for SUBSTITUTION variant', () => {
    const field = createField({
      name: 'Cat',
      typeOverride: FieldOverrideVariant.SUBSTITUTION,
      originalField: {
        name: 'AbstractAnimal',
        displayName: 'AbstractAnimal',
        namespaceURI: null,
        namespacePrefix: null,
        type: Types.Container,
        typeQName: null,
        namedTypeFragmentRefs: [],
      },
    });

    const result = getOverrideDisplayInfo(field, namespaceMap);
    expect(result).not.toBeNull();
    expect(result!.originalLabel).toBe('Original element');
    expect(result!.currentLabel).toBe('Substituted element');
    expect(result!.original).toBe('AbstractAnimal');
    expect(result!.current).toBe('Cat');
  });

  it('should show "?" when substitution has no originalField', () => {
    const field = createField({
      name: 'Cat',
      typeOverride: FieldOverrideVariant.SUBSTITUTION,
      originalField: undefined,
    });

    const result = getOverrideDisplayInfo(field, namespaceMap);
    expect(result).not.toBeNull();
    expect(result!.original).toBe('?');
  });
});
