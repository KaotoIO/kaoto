import { IField } from '../../models/datamapper/document';
import { FieldOverrideVariant, IFieldSubstituteInfo, Types } from '../../models/datamapper/types';
import { QName } from '../../xml-schema-ts/QName';
import { FieldOverrideService } from '../document/field-override.service';
import { WrapperBaseService } from './wrapper-base.service';

vi.mock('../document/field-override.service', () => ({
  FieldOverrideService: {
    getFieldSubstitutionCandidates: vi.fn().mockReturnValue({}),
  },
}));

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
    typeOverride: FieldOverrideVariant.NONE,
    ...overrides,
  } as IField;
}

function mockSubstituteInfo(
  name: string,
  ns: string = 'http://test',
  type: Types = Types.Container,
): IFieldSubstituteInfo {
  return {
    qname: new QName(ns, name),
    displayName: name,
    type,
    typeQName: null,
    namedTypeFragmentRefs: [],
  };
}

describe('WrapperBaseService', () => {
  const namespaceMap = { xs: 'http://www.w3.org/2001/XMLSchema' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveCandidateField', () => {
    it('should use cached candidates when wrapperField matches knownWrapper', () => {
      const childField = mockField({ name: 'Cat', namespaceURI: 'http://test' });
      const wrapperField = mockField({ fields: [childField] });
      const cachedCandidates: Record<string, IFieldSubstituteInfo> = {
        'ns:Cat': mockSubstituteInfo('Cat'),
      };

      const result = WrapperBaseService.resolveCandidateField(
        wrapperField,
        'ns:Cat',
        cachedCandidates,
        wrapperField,
        namespaceMap,
      );

      expect(result).toBe(childField);
      expect(FieldOverrideService.getFieldSubstitutionCandidates).not.toHaveBeenCalled();
    });

    it('should call FieldOverrideService when wrapperField differs from knownWrapper', () => {
      const childField = mockField({ name: 'Cat', namespaceURI: 'http://test' });
      const wrapperField = mockField({ fields: [childField] });
      const otherWrapper = mockField();
      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue({
        'ns:Cat': mockSubstituteInfo('Cat'),
      });

      const result = WrapperBaseService.resolveCandidateField(wrapperField, 'ns:Cat', {}, otherWrapper, namespaceMap);

      expect(result).toBe(childField);
      expect(FieldOverrideService.getFieldSubstitutionCandidates).toHaveBeenCalledWith(wrapperField, namespaceMap);
    });

    it('should return undefined when qname not found in candidates', () => {
      const wrapperField = mockField();
      const result = WrapperBaseService.resolveCandidateField(
        wrapperField,
        'ns:Unknown',
        {},
        wrapperField,
        namespaceMap,
      );

      expect(result).toBeUndefined();
    });

    it('should return matching child field when candidate is found', () => {
      const childField = mockField({ name: 'Dog', namespaceURI: 'http://test' });
      const wrapperField = mockField({ fields: [childField] });
      const cachedCandidates: Record<string, IFieldSubstituteInfo> = {
        'ns:Dog': mockSubstituteInfo('Dog'),
      };

      const result = WrapperBaseService.resolveCandidateField(
        wrapperField,
        'ns:Dog',
        cachedCandidates,
        wrapperField,
        namespaceMap,
      );

      expect(result).toBe(childField);
    });

    it('should return undefined when no child field matches the candidate qname', () => {
      const childField = mockField({ name: 'Cat', namespaceURI: 'http://other' });
      const wrapperField = mockField({ fields: [childField] });
      const cachedCandidates: Record<string, IFieldSubstituteInfo> = {
        'ns:Cat': mockSubstituteInfo('Cat'),
      };

      const result = WrapperBaseService.resolveCandidateField(
        wrapperField,
        'ns:Cat',
        cachedCandidates,
        wrapperField,
        namespaceMap,
      );

      expect(result).toBeUndefined();
    });
  });
});
