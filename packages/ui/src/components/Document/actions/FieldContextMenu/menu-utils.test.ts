import { IField } from '../../../../models/datamapper/document';
import { IFieldSubstituteInfo, Types } from '../../../../models/datamapper/types';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { QName } from '../../../../xml-schema-ts/QName';
import { buildAbstractCandidates, dissolveChoiceMembers } from './menu-utils';

function mockField(overrides: Partial<IField> = {}): IField {
  return {
    name: 'field',
    displayName: 'Field',
    id: 'field-id',
    type: Types.String,
    fields: [],
    minOccurs: 1,
    maxOccurs: 1,
    namespacePrefix: null,
    namespaceURI: '',
    namedTypeFragmentRefs: [],
    predicates: [],
    ...overrides,
  } as IField;
}

function mockSubstituteInfo(name: string, type: Types = Types.Container): IFieldSubstituteInfo {
  return {
    qname: new QName('http://test', name),
    displayName: name,
    type,
    typeQName: null,
    namedTypeFragmentRefs: [],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dissolveChoiceMembers', () => {
  it('should pass through regular members', () => {
    const members = [
      mockField({ name: 'email', displayName: 'Email', type: Types.String }),
      mockField({ name: 'phone', displayName: 'Phone', type: Types.String }),
    ];
    const result = dissolveChoiceMembers(members, {});

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(expect.objectContaining({ key: '0', label: 'Email', selection: { memberIndex: 0 } }));
    expect(result[1]).toEqual(expect.objectContaining({ key: '1', label: 'Phone', selection: { memberIndex: 1 } }));
  });

  it('should dissolve abstract members into substitution candidates', () => {
    const abstractMember = mockField({ wrapperKind: 'abstract' });
    vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue({
      'ns:Cat': mockSubstituteInfo('Cat'),
      'ns:Dog': mockSubstituteInfo('Dog'),
    });

    const result = dissolveChoiceMembers([abstractMember], {});

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        key: '0:ns:Cat',
        label: 'Cat',
        selection: { memberIndex: 0, substituteQName: 'ns:Cat' },
      }),
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        key: '0:ns:Dog',
        label: 'Dog',
        selection: { memberIndex: 0, substituteQName: 'ns:Dog' },
      }),
    );
  });

  it('should skip sequence members', () => {
    const members = [
      mockField({ name: 'normal', displayName: 'Normal' }),
      mockField({ wrapperKind: 'sequence', name: 'seq' }),
    ];
    const result = dissolveChoiceMembers(members, {});

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Normal');
  });

  it('should include children preview for complex members', () => {
    const member = mockField({
      name: 'address',
      displayName: 'Address',
      type: Types.Container,
      fields: [mockField({ displayName: 'Street' }), mockField({ displayName: 'City' })],
    });
    const result = dissolveChoiceMembers([member], {});

    expect(result[0].childrenPreview).toEqual(['Street', 'City']);
  });

  it('should handle empty members list', () => {
    expect(dissolveChoiceMembers([], {})).toEqual([]);
  });
});

describe('buildAbstractCandidates', () => {
  it('should convert substitution candidates to WrapperCandidates', () => {
    const abstractField = mockField({ wrapperKind: 'abstract' });
    vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue({
      'ns:Cat': mockSubstituteInfo('Cat'),
      'ns:Dog': mockSubstituteInfo('Dog'),
    });

    const result = buildAbstractCandidates(abstractField, {});

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      key: 'ns:Cat',
      label: 'Cat',
      typeBadge: Types.Container,
      selection: { memberIndex: 0, substituteQName: 'ns:Cat' },
    });
    expect(result[1]).toEqual({
      key: 'ns:Dog',
      label: 'Dog',
      typeBadge: Types.Container,
      selection: { memberIndex: 0, substituteQName: 'ns:Dog' },
    });
  });

  it('should return empty array when no candidates', () => {
    const abstractField = mockField({ wrapperKind: 'abstract' });
    vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue({});

    const result = buildAbstractCandidates(abstractField, {});
    expect(result).toEqual([]);
  });
});
