import { IField } from '../../../../models/datamapper/document';
import { FieldOverrideVariant, IFieldSubstituteInfo, IFieldTypeInfo, Types } from '../../../../models/datamapper/types';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { QName } from '../../../../xml-schema-ts/QName';
import { CandidateDisplay, derivePreselectedKey, getOverrideCandidates, getOverrideDisplayInfo } from './override-util';

const NS = 'http://www.w3.org/2001/XMLSchema';
const SUB_NS = 'http://example.com/sub';

function createField(overrides: Partial<IField> = {}): IField {
  return {
    name: 'fieldA',
    displayName: 'fieldA',
    type: Types.String,
    typeQName: new QName(NS, 'string'),
    typeOverride: FieldOverrideVariant.NONE,
    namespaceURI: '',
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
        namespaceURI: '',
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
        namespaceURI: '',
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

  it('should return type override display info for FORCE variant', () => {
    const field = createField({
      typeOverride: FieldOverrideVariant.FORCE,
      typeQName: new QName(NS, 'anyType'),
      originalField: {
        name: 'fieldA',
        displayName: 'fieldA',
        namespaceURI: '',
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
    expect(result!.current).toBe('xs:anyType');
  });

  it('should use field.typeQName for original when originalField.typeQName is null', () => {
    // Line 36: field.originalField?.typeQName ?? field.typeQName — the ?? branch fires
    // Line 38: field.originalField?.typeQName?.toString() is undefined → falls to field.originalField?.type
    const field = createField({
      typeOverride: FieldOverrideVariant.SAFE,
      typeQName: new QName(NS, 'int'),
      originalField: {
        name: 'fieldA',
        displayName: 'fieldA',
        namespaceURI: '',
        namespacePrefix: null,
        type: Types.String,
        typeQName: null,
        namedTypeFragmentRefs: [],
      },
    });

    const result = getOverrideDisplayInfo(field, namespaceMap);
    expect(result).not.toBeNull();
    // original: formatQNameWithPrefix(field.typeQName, namespaceMap, originalField.type) → 'xs:int'
    // (the QName is non-null so formatQNameWithPrefix uses it, ignoring the fallback)
    expect(result!.original).toBe('xs:int');
    expect(result!.current).toBe('xs:int');
  });

  it('should use field.type as fallback for original when originalField is absent (type override)', () => {
    // Line 38: field.originalField?.typeQName?.toString() → undefined
    //          field.originalField?.type → undefined
    //          → falls through to field.type
    const field = createField({
      typeOverride: FieldOverrideVariant.SAFE,
      typeQName: new QName(NS, 'int'),
      originalField: undefined,
      type: Types.String,
    });

    const result = getOverrideDisplayInfo(field, namespaceMap);
    expect(result).not.toBeNull();
    // original: formatQNameWithPrefix(field.typeQName, namespaceMap, field.type) → 'xs:int'
    // (QName is non-null so it resolves normally; fallback 'String' is not used)
    expect(result!.original).toBe('xs:int');
    expect(result!.current).toBe('xs:int');
  });

  it('should use field.type as current fallback when field.typeQName is null', () => {
    // Line 40: field.typeQName?.toString() → undefined → falls to field.type
    const field = createField({
      typeOverride: FieldOverrideVariant.SAFE,
      typeQName: null,
      type: Types.String,
      originalField: {
        name: 'fieldA',
        displayName: 'fieldA',
        namespaceURI: '',
        namespacePrefix: null,
        type: Types.Integer,
        typeQName: new QName(NS, 'string'),
        namedTypeFragmentRefs: [],
      },
    });

    const result = getOverrideDisplayInfo(field, namespaceMap);
    expect(result).not.toBeNull();
    expect(result!.original).toBe('xs:string');
    // current: formatQNameWithPrefix(null, namespaceMap, field.type) → field.type fallback
    expect(result!.current).toBe(Types.String);
  });
});

describe('derivePreselectedKey', () => {
  const namespaceMap = { sub: SUB_NS, xs: NS };

  it('returns key when mode is substitution and key is in candidates', () => {
    const field = createField({
      typeOverride: FieldOverrideVariant.SUBSTITUTION,
      name: 'Cat',
      namespaceURI: SUB_NS,
    });
    const candidates: Record<string, CandidateDisplay> = { 'sub:Cat': { displayName: 'Cat', namespaceURI: SUB_NS } };
    expect(derivePreselectedKey(field, 'substitution', namespaceMap, candidates)).toBe('sub:Cat');
  });

  it('returns null when mode is substitution but key is not in candidates', () => {
    const field = createField({
      typeOverride: FieldOverrideVariant.SUBSTITUTION,
      name: 'Dog',
      namespaceURI: SUB_NS,
    });
    const candidates: Record<string, CandidateDisplay> = { 'sub:Cat': { displayName: 'Cat', namespaceURI: SUB_NS } };
    expect(derivePreselectedKey(field, 'substitution', namespaceMap, candidates)).toBeNull();
  });

  it('returns null when mode is substitution but typeOverride is not SUBSTITUTION', () => {
    const field = createField({ typeOverride: FieldOverrideVariant.NONE });
    expect(derivePreselectedKey(field, 'substitution', namespaceMap, {})).toBeNull();
  });

  it('returns key when mode is type and override is SAFE with matching typeQName', () => {
    const field = createField({
      typeOverride: FieldOverrideVariant.SAFE,
      typeQName: new QName(NS, 'int'),
    });
    const candidates: Record<string, CandidateDisplay> = { 'xs:int': { displayName: 'int', namespaceURI: NS } };
    expect(derivePreselectedKey(field, 'type', namespaceMap, candidates)).toBe('xs:int');
  });

  it('returns null when mode is type and key is not in candidates', () => {
    const field = createField({
      typeOverride: FieldOverrideVariant.SAFE,
      typeQName: new QName(NS, 'boolean'),
    });
    const candidates: Record<string, CandidateDisplay> = { 'xs:int': { displayName: 'int', namespaceURI: NS } };
    expect(derivePreselectedKey(field, 'type', namespaceMap, candidates)).toBeNull();
  });

  it('returns null when mode is type but typeOverride is NONE', () => {
    const field = createField({ typeOverride: FieldOverrideVariant.NONE, typeQName: new QName(NS, 'int') });
    expect(derivePreselectedKey(field, 'type', namespaceMap, {})).toBeNull();
  });

  it('returns null when mode is type but typeOverride is SUBSTITUTION', () => {
    const field = createField({ typeOverride: FieldOverrideVariant.SUBSTITUTION, typeQName: new QName(NS, 'int') });
    expect(derivePreselectedKey(field, 'type', namespaceMap, {})).toBeNull();
  });

  it('returns null when mode is type but typeQName is null', () => {
    const field = createField({ typeOverride: FieldOverrideVariant.SAFE, typeQName: null });
    expect(derivePreselectedKey(field, 'type', namespaceMap, {})).toBeNull();
  });
});

describe('getOverrideCandidates', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds type candidates from getSafeOverrideCandidates and resolves namespaceURI', () => {
    const typeQName = new QName(NS, 'int');
    const mockRaw: Record<string, IFieldTypeInfo> = {
      'xs:int': {
        displayName: 'int',
        typeQName,
        type: Types.Integer,
        isBuiltIn: true,
        description: 'Integer type',
      },
    };
    const field = createField();
    vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockRaw);

    const { candidates, selectedKey } = getOverrideCandidates(field, 'type', { xs: NS });

    expect(candidates['xs:int'].displayName).toBe('int');
    expect(candidates['xs:int'].namespaceURI).toBe(NS);
    expect(selectedKey).toBeNull();
  });

  it('populates rawTypeInfo for type-mode candidates', () => {
    const typeQName = new QName(NS, 'int');
    const mockRaw: Record<string, IFieldTypeInfo> = {
      'xs:int': { displayName: 'int', typeQName, type: Types.Integer, isBuiltIn: true },
    };
    const field = createField();
    vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockRaw);

    const { candidates } = getOverrideCandidates(field, 'type', { xs: NS });

    expect(candidates['xs:int'].rawTypeInfo).toBe(mockRaw['xs:int']);
  });

  it('builds substitution candidates from getFieldSubstitutionCandidates and resolves namespaceURI', () => {
    const qname = new QName(SUB_NS, 'Cat');
    const mockRaw: Record<string, IFieldSubstituteInfo> = {
      'sub:Cat': {
        displayName: 'Cat',
        qname,
        type: Types.Container,
        typeQName: null,
        namedTypeFragmentRefs: [],
      },
    };
    const field = createField();
    vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue(mockRaw);

    const { candidates, selectedKey } = getOverrideCandidates(field, 'substitution', { sub: SUB_NS });

    expect(candidates['sub:Cat'].displayName).toBe('Cat');
    expect(candidates['sub:Cat'].namespaceURI).toBe(SUB_NS);
    expect(selectedKey).toBeNull();
  });

  it('leaves rawTypeInfo undefined for substitution-mode candidates', () => {
    const qname = new QName(SUB_NS, 'Cat');
    const mockRaw: Record<string, IFieldSubstituteInfo> = {
      'sub:Cat': { displayName: 'Cat', qname, type: Types.Container, typeQName: null, namedTypeFragmentRefs: [] },
    };
    const field = createField();
    vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue(mockRaw);

    const { candidates } = getOverrideCandidates(field, 'substitution', { sub: SUB_NS });

    expect(candidates['sub:Cat'].rawTypeInfo).toBeUndefined();
  });

  it('uses empty string when typeQName has no namespace URI in type mode', () => {
    const typeQName = new QName(null, 'myType');
    const mockRaw: Record<string, IFieldTypeInfo> = {
      myType: { displayName: 'myType', typeQName, type: Types.String, isBuiltIn: false },
    };
    const field = createField();
    vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockRaw);

    const { candidates } = getOverrideCandidates(field, 'type', {});

    // QName(null, ...) returns '' from getNamespaceURI(); 'N/A' fallback only for null/undefined
    expect(candidates['myType'].namespaceURI).toBe('');
  });

  it('uses empty string when qname has no namespace URI in substitution mode', () => {
    const qname = new QName(null, 'Dog');
    const mockRaw: Record<string, IFieldSubstituteInfo> = {
      Dog: { displayName: 'Dog', qname, type: Types.Container, typeQName: null, namedTypeFragmentRefs: [] },
    };
    const field = createField();
    vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue(mockRaw);

    const { candidates } = getOverrideCandidates(field, 'substitution', {});

    // QName(null, ...) returns '' from getNamespaceURI(); 'N/A' fallback only for null/undefined
    expect(candidates['Dog'].namespaceURI).toBe('');
  });

  it('derives a pre-selected key for type mode when field has SAFE override with matching typeQName', () => {
    const typeQName = new QName(NS, 'int');
    const mockRaw: Record<string, IFieldTypeInfo> = {
      'xs:int': { displayName: 'int', typeQName, type: Types.Integer, isBuiltIn: true },
    };
    const field = createField({ typeOverride: FieldOverrideVariant.SAFE, typeQName });
    vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockRaw);

    const { selectedKey } = getOverrideCandidates(field, 'type', { xs: NS });

    expect(selectedKey).toBe('xs:int');
  });
});
