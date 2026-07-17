import { IField } from '../../models/datamapper/document';
import { DocumentDefinitionType, DocumentType } from '../../models/datamapper/document';
import { FieldItem, MappingTree } from '../../models/datamapper/mapping';
import { FieldOverrideVariant, IFieldSubstituteInfo, Types } from '../../models/datamapper/types';
import {
  FieldItemNodeData,
  FieldNodeData,
  TargetAbstractFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../models/datamapper/visualization';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { QName } from '../../xml-schema-ts/QName';
import { DocumentUtilService } from '../document/document-util.service';
import { FieldOverrideService } from '../document/field-override.service';
import { WrapperSelectionService } from '../document/wrapper-selection.service';
import { MappingService } from '../mapping/mapping.service';
import { SchemaPathService } from '../schema-path.service';
import { MappingActionService } from './mapping-action.service';
import { VisualizationService } from './visualization.service';
import { VisualizationUtilService } from './visualization-util.service';
import { WrapperActionService } from './wrapper-action.service';

vi.mock('../document/field-override.service', () => ({
  FieldOverrideService: {
    revertFieldTypeOverride: vi.fn(),
    revertFieldSubstitution: vi.fn(),
    getFieldSubstitutionCandidates: vi.fn().mockReturnValue({}),
    applyFieldSubstitution: vi.fn(),
  },
}));

vi.mock('./visualization-util.service', () => ({
  VisualizationUtilService: {
    getField: vi.fn(),
    isAbstractWrapperMember: vi.fn().mockReturnValue(false),
    isAbstractField: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('./visualization.service', () => ({
  VisualizationService: {
    getChoiceMemberLabel: vi.fn().mockReturnValue('choice-label'),
  },
}));

vi.mock('../document/document-util.service', () => ({
  DocumentUtilService: {
    getSelectedMember: vi.fn(),
    invalidateDescendants: vi.fn(),
    processOverrides: vi.fn(),
  },
}));

vi.mock('../document/wrapper-selection.service', () => ({
  WrapperSelectionService: {
    setChoiceSelection: vi.fn(),
    clearChoiceSelection: vi.fn(),
    clearDescendantWrapperSelections: vi.fn(),
  },
}));

vi.mock('../mapping/mapping.service', () => ({
  MappingService: {
    updateFieldItemField: vi.fn(),
    createFieldItem: vi.fn(),
  },
}));

vi.mock('./mapping-action.service', () => ({
  MappingActionService: {
    getOrCreateFieldItem: vi.fn(),
  },
}));

vi.mock('../schema-path.service', () => ({
  SchemaPathService: {
    build: vi.fn().mockReturnValue('mock-schema-path'),
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

function createMappingTree(): MappingTree {
  return new MappingTree(DocumentType.TARGET_BODY, 'test-doc', DocumentDefinitionType.XML_SCHEMA);
}

function createTargetDocNodeData(): TargetDocumentNodeData {
  const targetDoc = TestUtil.createTargetOrderDoc();
  const tree = createMappingTree();
  return new TargetDocumentNodeData(targetDoc, tree);
}

function createTargetFieldNodeData(field: IField, mapping?: FieldItem): TargetFieldNodeData {
  const parentNode = createTargetDocNodeData();
  return new TargetFieldNodeData(parentNode, field, mapping);
}

function createFieldItemNodeData(fieldItem: FieldItem, wrapperField?: IField): FieldItemNodeData {
  const parentNode = createTargetDocNodeData();
  return new FieldItemNodeData(parentNode, fieldItem, wrapperField);
}

describe('WrapperActionService', () => {
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

      const result = WrapperActionService.resolveCandidateField(
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

      const result = WrapperActionService.resolveCandidateField(wrapperField, 'ns:Cat', {}, otherWrapper, namespaceMap);

      expect(result).toBe(childField);
      expect(FieldOverrideService.getFieldSubstitutionCandidates).toHaveBeenCalledWith(wrapperField, namespaceMap);
    });

    it('should return undefined when qname not found in candidates', () => {
      const wrapperField = mockField();
      const result = WrapperActionService.resolveCandidateField(
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

      const result = WrapperActionService.resolveCandidateField(
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

      const result = WrapperActionService.resolveCandidateField(
        wrapperField,
        'ns:Cat',
        cachedCandidates,
        wrapperField,
        namespaceMap,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('resolveAbstractFieldInfo', () => {
    it('should identify an abstract wrapper field', () => {
      const field = mockField({ wrapperKind: 'abstract' });
      const nodeData = { field } as unknown as FieldNodeData;
      vi.mocked(VisualizationUtilService.getField).mockReturnValue(field);
      vi.mocked(VisualizationUtilService.isAbstractWrapperMember).mockReturnValue(false);
      vi.mocked(VisualizationUtilService.isAbstractField).mockReturnValue(false);

      const result = WrapperActionService.resolveAbstractFieldInfo(nodeData, namespaceMap);

      expect(result.isAbstractWrapper).toBe(true);
      expect(result.abstractWrapperField).toBe(field);
    });

    it('should identify a selected substitution with abstractField from nodeData', () => {
      const abstractField = mockField({ wrapperKind: 'abstract' });
      const field = mockField();
      const nodeData = { field, abstractField } as unknown as TargetAbstractFieldNodeData;
      vi.mocked(VisualizationUtilService.getField).mockReturnValue(field);
      vi.mocked(VisualizationUtilService.isAbstractWrapperMember).mockReturnValue(false);
      vi.mocked(VisualizationUtilService.isAbstractField).mockReturnValue(true);

      const result = WrapperActionService.resolveAbstractFieldInfo(nodeData, namespaceMap);

      expect(result.isSelectedSubstitution).toBe(true);
      expect(result.abstractWrapperField).toBe(abstractField);
    });

    it('should identify an abstract wrapper member via FieldItemNodeData with wrapperField', () => {
      const wrapperField = mockField({ wrapperKind: 'abstract' });
      const field = mockField();
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, field);
      const nodeData = createFieldItemNodeData(fieldItem, wrapperField);
      vi.mocked(VisualizationUtilService.getField).mockReturnValue(field);
      vi.mocked(VisualizationUtilService.isAbstractWrapperMember).mockReturnValue(true);
      vi.mocked(VisualizationUtilService.isAbstractField).mockReturnValue(false);

      const result = WrapperActionService.resolveAbstractFieldInfo(nodeData, namespaceMap);

      expect(result.isAbstractWrapperMember).toBe(true);
      expect(result.abstractWrapperField).toBe(wrapperField);
    });

    it('should identify an abstract wrapper member via parent fallback', () => {
      const abstractField = mockField({ wrapperKind: 'abstract' });
      const field = mockField();
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, field);
      const parentNodeData = createTargetDocNodeData();
      const parentTarget = new TargetAbstractFieldNodeData(parentNodeData, abstractField);
      const nodeData = new FieldItemNodeData(parentTarget, fieldItem);
      vi.mocked(VisualizationUtilService.getField).mockReturnValue(field);
      vi.mocked(VisualizationUtilService.isAbstractWrapperMember).mockReturnValue(true);
      vi.mocked(VisualizationUtilService.isAbstractField).mockReturnValue(false);

      const result = WrapperActionService.resolveAbstractFieldInfo(nodeData, namespaceMap);

      expect(result.isAbstractWrapperMember).toBe(true);
      expect(result.abstractWrapperField).toBe(abstractField);
    });

    it('should compute candidateQName when field has an abstract parent', () => {
      const parent = mockField({ wrapperKind: 'abstract' });
      const field = mockField({ name: 'Cat', namespaceURI: 'http://test', parent: parent as IField });
      const nodeData = { field } as unknown as FieldNodeData;
      vi.mocked(VisualizationUtilService.getField).mockReturnValue(field);
      vi.mocked(VisualizationUtilService.isAbstractWrapperMember).mockReturnValue(false);
      vi.mocked(VisualizationUtilService.isAbstractField).mockReturnValue(false);
      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue({
        'ns:Cat': mockSubstituteInfo('Cat'),
      });

      const result = WrapperActionService.resolveAbstractFieldInfo(nodeData, namespaceMap);

      expect(result.isSubstitutionCandidate).toBe(true);
      expect(result.parentAbstractField).toBe(parent);
      expect(result.candidateQName).toBe('ns:Cat');
    });

    it('should return undefined candidateQName when parent is not abstract', () => {
      const parent = mockField({ wrapperKind: 'choice' });
      const field = mockField({ parent: parent as IField });
      const nodeData = { field } as unknown as FieldNodeData;
      vi.mocked(VisualizationUtilService.getField).mockReturnValue(field);
      vi.mocked(VisualizationUtilService.isAbstractWrapperMember).mockReturnValue(false);
      vi.mocked(VisualizationUtilService.isAbstractField).mockReturnValue(false);

      const result = WrapperActionService.resolveAbstractFieldInfo(nodeData, namespaceMap);

      expect(result.isSubstitutionCandidate).toBe(false);
      expect(result.parentAbstractField).toBeUndefined();
      expect(result.candidateQName).toBeUndefined();
    });

    it('should return all-false flags for a regular non-wrapper field', () => {
      const field = mockField();
      const nodeData = { field } as unknown as FieldNodeData;
      vi.mocked(VisualizationUtilService.getField).mockReturnValue(field);
      vi.mocked(VisualizationUtilService.isAbstractWrapperMember).mockReturnValue(false);
      vi.mocked(VisualizationUtilService.isAbstractField).mockReturnValue(false);

      const result = WrapperActionService.resolveAbstractFieldInfo(nodeData, namespaceMap);

      expect(result.isAbstractWrapper).toBe(false);
      expect(result.isAbstractWrapperMember).toBe(false);
      expect(result.isSelectedSubstitution).toBe(false);
      expect(result.isSubstitutionCandidate).toBe(false);
      expect(result.abstractWrapperField).toBeUndefined();
      expect(result.parentAbstractField).toBeUndefined();
      expect(result.candidateQName).toBeUndefined();
    });
  });

  describe('fieldToCandidate', () => {
    it('should use getChoiceMemberLabel for choice wrapper fields', () => {
      const field = mockField({ wrapperKind: 'choice', type: Types.Container });
      vi.mocked(VisualizationService.getChoiceMemberLabel).mockReturnValue('(email | phone)');

      const result = WrapperActionService.fieldToCandidate(field, 'key1', 0);

      expect(result.label).toBe('(email | phone)');
      expect(VisualizationService.getChoiceMemberLabel).toHaveBeenCalledWith(field);
    });

    it('should use displayName for non-choice fields', () => {
      const field = mockField({ displayName: 'EmailAddress', type: Types.String });

      const result = WrapperActionService.fieldToCandidate(field, 'key1', 2);

      expect(result.label).toBe('EmailAddress');
      expect(result.typeBadge).toBe(Types.String);
      expect(result.selection).toEqual({ memberIndex: 2 });
    });

    it('should fall back to name when displayName is empty', () => {
      const field = mockField({ displayName: '', name: 'fallbackName' });

      const result = WrapperActionService.fieldToCandidate(field, 'key1', 0);

      expect(result.label).toBe('fallbackName');
    });

    it('should populate childrenPreview from first 3 children', () => {
      const children = [
        mockField({ displayName: 'A', name: 'a' }),
        mockField({ displayName: 'B', name: 'b' }),
        mockField({ displayName: 'C', name: 'c' }),
        mockField({ displayName: 'D', name: 'd' }),
        mockField({ displayName: 'E', name: 'e' }),
      ];
      const field = mockField({ fields: children });

      const result = WrapperActionService.fieldToCandidate(field, 'key1', 0);

      expect(result.childrenPreview).toEqual(['A', 'B', 'C']);
    });

    it('should return undefined childrenPreview for field with no children', () => {
      const field = mockField({ fields: [] });

      const result = WrapperActionService.fieldToCandidate(field, 'key1', 0);

      expect(result.childrenPreview).toBeUndefined();
    });
  });

  describe('dissolveChoiceMembers', () => {
    it('should dissolve abstract members into substitution candidates', () => {
      const abstractMember = mockField({ wrapperKind: 'abstract' });
      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue({
        'ns:Cat': mockSubstituteInfo('Cat'),
        'ns:Dog': mockSubstituteInfo('Dog'),
      });

      const result = WrapperActionService.dissolveChoiceMembers([abstractMember], namespaceMap);

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
      const sequenceMember = mockField({ wrapperKind: 'sequence' });

      const result = WrapperActionService.dissolveChoiceMembers([sequenceMember], namespaceMap);

      expect(result).toHaveLength(0);
    });

    it('should pass through normal members via fieldToCandidate', () => {
      const normalMember = mockField({ name: 'email', displayName: 'Email', type: Types.String });

      const result = WrapperActionService.dissolveChoiceMembers([normalMember], namespaceMap);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          key: '0',
          label: 'Email',
          typeBadge: Types.String,
          selection: { memberIndex: 0 },
        }),
      );
    });

    it('should handle mixed members in correct order', () => {
      const normal = mockField({ name: 'email', displayName: 'Email', type: Types.String });
      const abstract = mockField({ wrapperKind: 'abstract' });
      const sequence = mockField({ wrapperKind: 'sequence' });
      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue({
        'ns:Cat': mockSubstituteInfo('Cat'),
      });

      const result = WrapperActionService.dissolveChoiceMembers([normal, abstract, sequence], namespaceMap);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('0');
      expect(result[0].selection.memberIndex).toBe(0);
      expect(result[1].key).toBe('1:ns:Cat');
      expect(result[1].selection.memberIndex).toBe(1);
    });
  });

  describe('buildAbstractCandidates', () => {
    it('should return candidates with memberIndex 0 and substituteQName', () => {
      const abstractField = mockField({ wrapperKind: 'abstract' });
      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue({
        'ns:Cat': mockSubstituteInfo('Cat'),
        'ns:Dog': mockSubstituteInfo('Dog'),
      });

      const result = WrapperActionService.buildAbstractCandidates(abstractField, namespaceMap);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          key: 'ns:Cat',
          label: 'Cat',
          selection: { memberIndex: 0, substituteQName: 'ns:Cat' },
        }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          key: 'ns:Dog',
          label: 'Dog',
          selection: { memberIndex: 0, substituteQName: 'ns:Dog' },
        }),
      );
    });

    it('should return empty array when no candidates', () => {
      const abstractField = mockField({ wrapperKind: 'abstract' });
      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue({});

      const result = WrapperActionService.buildAbstractCandidates(abstractField, namespaceMap);

      expect(result).toHaveLength(0);
    });
  });

  describe('resolveSubstitutionCandidates', () => {
    it('should return empty record when abstractWrapperField is undefined', () => {
      const result = WrapperActionService.resolveSubstitutionCandidates(undefined, namespaceMap);

      expect(result).toEqual({});
      expect(FieldOverrideService.getFieldSubstitutionCandidates).not.toHaveBeenCalled();
    });

    it('should delegate to FieldOverrideService when field is present', () => {
      const field = mockField();
      const expected = { 'ns:Cat': mockSubstituteInfo('Cat') };
      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue(expected);

      const result = WrapperActionService.resolveSubstitutionCandidates(field, namespaceMap);

      expect(result).toBe(expected);
      expect(FieldOverrideService.getFieldSubstitutionCandidates).toHaveBeenCalledWith(field, namespaceMap);
    });
  });

  describe('resolveSelectedQName', () => {
    it('should return undefined when abstractWrapperField is undefined', () => {
      const result = WrapperActionService.resolveSelectedQName(undefined, {});

      expect(result).toBeUndefined();
    });

    it('should return QName when selectedField matches a candidate', () => {
      const field = mockField({ wrapperKind: 'abstract' });
      const selectedMember = mockField({ name: 'Cat', namespaceURI: 'http://test' });
      vi.mocked(DocumentUtilService.getSelectedMember).mockReturnValue(selectedMember);
      const candidates: Record<string, IFieldSubstituteInfo> = {
        'ns:Cat': mockSubstituteInfo('Cat'),
      };

      const result = WrapperActionService.resolveSelectedQName(field, candidates);

      expect(result).toBe('ns:Cat');
    });

    it('should return undefined when no selectedField found', () => {
      const field = mockField({ wrapperKind: 'abstract' });
      vi.mocked(DocumentUtilService.getSelectedMember).mockReturnValue(undefined);

      const result = WrapperActionService.resolveSelectedQName(field, {});

      expect(result).toBeUndefined();
    });
  });

  describe('resolveMemberSelectedQName', () => {
    it('should return undefined when not abstract wrapper member', () => {
      const field = mockField();
      const result = WrapperActionService.resolveMemberSelectedQName(false, field, mockField(), {});

      expect(result).toBeUndefined();
    });

    it('should return undefined when field is undefined', () => {
      const result = WrapperActionService.resolveMemberSelectedQName(true, undefined, mockField(), {});

      expect(result).toBeUndefined();
    });

    it('should return undefined when abstractWrapperField is undefined', () => {
      const result = WrapperActionService.resolveMemberSelectedQName(true, mockField(), undefined, {});

      expect(result).toBeUndefined();
    });

    it('should return QName when all inputs are valid', () => {
      const field = mockField({ name: 'Cat', namespaceURI: 'http://test' });
      const abstractField = mockField({ wrapperKind: 'abstract' });
      const candidates: Record<string, IFieldSubstituteInfo> = {
        'ns:Cat': mockSubstituteInfo('Cat'),
      };

      const result = WrapperActionService.resolveMemberSelectedQName(true, field, abstractField, candidates);

      expect(result).toBe('ns:Cat');
    });
  });

  describe('applyAbstractSubstitution', () => {
    it('should route to per-instance when target side and maxOccurs > 1', () => {
      const wrapperField = mockField({ maxOccurs: -1 });
      const childField = mockField({ name: 'Cat', namespaceURI: 'http://test' });
      wrapperField.fields = [childField];
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, wrapperField);
      const nodeData = createFieldItemNodeData(fieldItem);
      const candidates: Record<string, IFieldSubstituteInfo> = {
        'ns:Cat': mockSubstituteInfo('Cat'),
      };
      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue(candidates);
      const mockFieldItem = new FieldItem(tree, childField);
      vi.mocked(MappingActionService.getOrCreateFieldItem).mockReturnValue(mockFieldItem);
      vi.mocked(MappingService.createFieldItem).mockReturnValue(mockFieldItem);

      WrapperActionService.applyAbstractSubstitution(
        nodeData,
        wrapperField,
        'ns:Cat',
        candidates,
        undefined,
        namespaceMap,
        true,
      );

      expect(FieldOverrideService.applyFieldSubstitution).not.toHaveBeenCalled();
    });

    it('should route to document-level when source side', () => {
      const wrapperField = mockField({ maxOccurs: -1 });
      const nodeData = {} as FieldNodeData;

      WrapperActionService.applyAbstractSubstitution(
        nodeData,
        wrapperField,
        'ns:Cat',
        {},
        undefined,
        namespaceMap,
        false,
      );

      expect(FieldOverrideService.applyFieldSubstitution).toHaveBeenCalledWith(wrapperField, 'ns:Cat', namespaceMap);
    });

    it('should route to document-level when maxOccurs is 1', () => {
      const wrapperField = mockField({ maxOccurs: 1 });
      const nodeData = {} as FieldNodeData;

      WrapperActionService.applyAbstractSubstitution(
        nodeData,
        wrapperField,
        'ns:Cat',
        {},
        undefined,
        namespaceMap,
        true,
      );

      expect(FieldOverrideService.applyFieldSubstitution).toHaveBeenCalledWith(wrapperField, 'ns:Cat', namespaceMap);
    });
  });

  describe('clearAbstractSubstitution', () => {
    it('should route to per-instance when target side and maxOccurs > 1', () => {
      const wrapperField = mockField({ maxOccurs: -1 });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, wrapperField);
      const nodeData = createFieldItemNodeData(fieldItem);

      WrapperActionService.clearAbstractSubstitution(nodeData, wrapperField, namespaceMap, true);

      expect(FieldOverrideService.revertFieldSubstitution).not.toHaveBeenCalled();
      expect(SchemaPathService.build).not.toHaveBeenCalled();
    });

    it('should route to document-level when source side', () => {
      const ownerDocument = TestUtil.createTargetOrderDoc();
      const wrapperField = mockField({ maxOccurs: -1, ownerDocument });
      const nodeData = {} as FieldNodeData;

      WrapperActionService.clearAbstractSubstitution(nodeData, wrapperField, namespaceMap, false);

      expect(SchemaPathService.build).toHaveBeenCalledWith(wrapperField, namespaceMap);
      expect(DocumentUtilService.invalidateDescendants).toHaveBeenCalled();
      expect(FieldOverrideService.revertFieldSubstitution).toHaveBeenCalledWith(wrapperField, namespaceMap);
    });

    it('should route to document-level when maxOccurs is 1', () => {
      const ownerDocument = TestUtil.createTargetOrderDoc();
      const wrapperField = mockField({ maxOccurs: 1, ownerDocument });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, wrapperField);
      const nodeData = createTargetFieldNodeData(wrapperField, fieldItem);

      WrapperActionService.clearAbstractSubstitution(nodeData, wrapperField, namespaceMap, true);

      expect(FieldOverrideService.revertFieldSubstitution).toHaveBeenCalledWith(wrapperField, namespaceMap);
    });
  });

  describe('getChoiceFieldDisplayName', () => {
    it('should use getChoiceMemberLabel for choice wrapper', () => {
      const field = mockField({ wrapperKind: 'choice' });
      vi.mocked(VisualizationService.getChoiceMemberLabel).mockReturnValue('(A | B)');

      const result = WrapperActionService.getChoiceFieldDisplayName(field);

      expect(result).toBe('(A | B)');
      expect(VisualizationService.getChoiceMemberLabel).toHaveBeenCalledWith(field);
    });

    it('should use displayName for non-choice field', () => {
      const field = mockField({ displayName: 'MyField' });

      const result = WrapperActionService.getChoiceFieldDisplayName(field);

      expect(result).toBe('MyField');
    });

    it('should fall back to name when displayName is empty', () => {
      const field = mockField({ displayName: '', name: 'fallback' });

      const result = WrapperActionService.getChoiceFieldDisplayName(field);

      expect(result).toBe('fallback');
    });
  });

  describe('dispatchChoiceSelection', () => {
    it('should route to per-instance when target side and maxOccurs > 1', () => {
      const memberField = mockField({ name: 'email' });
      const wrapper = mockField({ maxOccurs: -1, fields: [memberField] });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, wrapper);
      const nodeData = createFieldItemNodeData(fieldItem);
      vi.mocked(MappingActionService.getOrCreateFieldItem).mockReturnValue(fieldItem);
      vi.mocked(MappingService.createFieldItem).mockReturnValue(new FieldItem(tree, memberField));

      WrapperActionService.dispatchChoiceSelection(nodeData, wrapper, { memberIndex: 0 }, namespaceMap, true);

      expect(WrapperSelectionService.setChoiceSelection).not.toHaveBeenCalled();
    });

    it('should route to document-level otherwise', () => {
      const ownerDocument = TestUtil.createTargetOrderDoc();
      const wrapper = mockField({ maxOccurs: 1, ownerDocument });
      const nodeData = {} as FieldNodeData;

      WrapperActionService.dispatchChoiceSelection(nodeData, wrapper, { memberIndex: 0 }, namespaceMap, false);

      expect(WrapperSelectionService.setChoiceSelection).toHaveBeenCalledWith(ownerDocument, wrapper, 0, namespaceMap);
    });
  });

  describe('clearChoiceSelectionOnField', () => {
    it('should route to per-instance when target side and maxOccurs > 1', () => {
      const wrapper = mockField({ maxOccurs: -1 });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, wrapper);
      const nodeData = createFieldItemNodeData(fieldItem);

      WrapperActionService.clearChoiceSelectionOnField(nodeData, wrapper, namespaceMap, true);

      expect(WrapperSelectionService.clearChoiceSelection).not.toHaveBeenCalled();
    });

    it('should route to document-level otherwise', () => {
      const ownerDocument = TestUtil.createTargetOrderDoc();
      const wrapper = mockField({ maxOccurs: 1, ownerDocument });
      const nodeData = {} as FieldNodeData;

      WrapperActionService.clearChoiceSelectionOnField(nodeData, wrapper, namespaceMap, false);

      expect(WrapperSelectionService.clearDescendantWrapperSelections).toHaveBeenCalledWith(wrapper, namespaceMap);
      expect(DocumentUtilService.invalidateDescendants).toHaveBeenCalled();
      expect(WrapperSelectionService.clearChoiceSelection).toHaveBeenCalledWith(ownerDocument, wrapper, namespaceMap);
    });
  });

  describe('resolveChoiceWrapper', () => {
    it('should return choiceWrapperMemberField when isChoiceWrapperMember is true', () => {
      const choiceField = mockField({ wrapperKind: 'choice' });
      const fallback = mockField();

      const result = WrapperActionService.resolveChoiceWrapper(true, choiceField, fallback);

      expect(result).toBe(choiceField);
    });

    it('should return fallback when isChoiceWrapperMember is false', () => {
      const choiceField = mockField({ wrapperKind: 'choice' });
      const fallback = mockField();

      const result = WrapperActionService.resolveChoiceWrapper(false, choiceField, fallback);

      expect(result).toBe(fallback);
    });
  });

  describe('resolveMemberSelectedKey', () => {
    it('should return null when nodeData is not FieldItemNodeData', () => {
      const nodeData = {} as FieldNodeData;

      const result = WrapperActionService.resolveMemberSelectedKey(nodeData, mockField(), [], namespaceMap);

      expect(result).toBeNull();
    });

    it('should return null when wrapper is undefined', () => {
      const field = mockField();
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, field);
      const nodeData = createFieldItemNodeData(fieldItem);

      const result = WrapperActionService.resolveMemberSelectedKey(nodeData, undefined, [], namespaceMap);

      expect(result).toBeNull();
    });

    it('should return null when member field not in wrapper.fields and no parent', () => {
      const memberField = mockField({ name: 'unknown' });
      const wrapper = mockField({ fields: [] });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, memberField);
      const nodeData = createFieldItemNodeData(fieldItem);

      const result = WrapperActionService.resolveMemberSelectedKey(nodeData, wrapper, [], namespaceMap);

      expect(result).toBeNull();
    });

    it('should resolve via parent when idx < 0 with abstract parent', () => {
      const abstractParent = mockField({ wrapperKind: 'abstract' }) as IField;
      const memberField = mockField({ name: 'Cat', namespaceURI: 'http://test', parent: abstractParent });
      const wrapper = mockField({ fields: [abstractParent] });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, memberField);
      const nodeData = createFieldItemNodeData(fieldItem);
      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue({
        'ns:Cat': mockSubstituteInfo('Cat'),
      });
      const dissolved = [
        {
          key: '0:ns:Cat',
          label: 'Cat',
          typeBadge: Types.Container,
          selection: { memberIndex: 0, substituteQName: 'ns:Cat' },
        },
      ];

      const result = WrapperActionService.resolveMemberSelectedKey(nodeData, wrapper, dissolved, namespaceMap);

      expect(result).toBe('0:ns:Cat');
    });

    it('should return matching dissolved key when idx >= 0', () => {
      const memberField = mockField({ name: 'email' });
      const wrapper = mockField({ fields: [memberField] });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, memberField);
      const nodeData = createFieldItemNodeData(fieldItem);
      const dissolved = [{ key: '0', label: 'Email', typeBadge: Types.String, selection: { memberIndex: 0 } }];

      const result = WrapperActionService.resolveMemberSelectedKey(nodeData, wrapper, dissolved, namespaceMap);

      expect(result).toBe('0');
    });

    it('should return null when idx >= 0 but no dissolved match', () => {
      const memberField = mockField({ name: 'email' });
      const wrapper = mockField({ fields: [memberField] });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, memberField);
      const nodeData = createFieldItemNodeData(fieldItem);

      const result = WrapperActionService.resolveMemberSelectedKey(nodeData, wrapper, [], namespaceMap);

      expect(result).toBeNull();
    });
  });

  describe('resolveSelectedModalKey', () => {
    it('should return memberSelectedKey when isChoiceWrapperMember is true', () => {
      const result = WrapperActionService.resolveSelectedModalKey(true, 'key1', undefined, []);

      expect(result).toBe('key1');
    });

    it('should return null when selectedMemberIndex is undefined', () => {
      const wrapper = mockField();

      const result = WrapperActionService.resolveSelectedModalKey(false, null, wrapper, []);

      expect(result).toBeNull();
    });

    it('should match dissolved with substituteQName for abstract member', () => {
      const qname = new QName('http://test', 'Cat');
      const abstractMember = mockField({
        wrapperKind: 'abstract',
        selectedMemberQName: qname,
      });
      const wrapper = mockField({ selectedMemberIndex: 0, fields: [abstractMember] });
      const dissolved = [
        {
          key: '0:ns:Cat',
          label: 'Cat',
          typeBadge: Types.Container,
          selection: { memberIndex: 0, substituteQName: qname.toString() },
        },
      ];

      const result = WrapperActionService.resolveSelectedModalKey(false, null, wrapper, dissolved);

      expect(result).toBe('0:ns:Cat');
    });

    it('should match dissolved without substituteQName for normal member', () => {
      const normalMember = mockField({ name: 'email' });
      const wrapper = mockField({ selectedMemberIndex: 0, fields: [normalMember] });
      const dissolved = [{ key: '0', label: 'Email', typeBadge: Types.String, selection: { memberIndex: 0 } }];

      const result = WrapperActionService.resolveSelectedModalKey(false, null, wrapper, dissolved);

      expect(result).toBe('0');
    });

    it('should return null when no dissolved candidate matches', () => {
      const normalMember = mockField({ name: 'email' });
      const wrapper = mockField({ selectedMemberIndex: 0, fields: [normalMember] });

      const result = WrapperActionService.resolveSelectedModalKey(false, null, wrapper, []);

      expect(result).toBeNull();
    });
  });

  describe('revertOverride', () => {
    it('should call revertFieldSubstitution when field has SUBSTITUTION override', () => {
      const testTargetDoc = TestUtil.createTargetOrderDoc();
      const field = testTargetDoc.fields[0];
      field.typeOverride = FieldOverrideVariant.SUBSTITUTION;

      WrapperActionService.revertOverride(field, namespaceMap);

      expect(FieldOverrideService.revertFieldSubstitution).toHaveBeenCalledWith(field, namespaceMap);
      expect(FieldOverrideService.revertFieldTypeOverride).not.toHaveBeenCalled();
    });

    it('should not call any service when field has no override', () => {
      const testTargetDoc = TestUtil.createTargetOrderDoc();
      const field = testTargetDoc.fields[0];
      field.typeOverride = FieldOverrideVariant.NONE;

      WrapperActionService.revertOverride(field, namespaceMap);

      expect(FieldOverrideService.revertFieldTypeOverride).not.toHaveBeenCalled();
      expect(FieldOverrideService.revertFieldSubstitution).not.toHaveBeenCalled();
    });

    it('should call revertFieldTypeOverride for type override', () => {
      const testTargetDoc = TestUtil.createTargetOrderDoc();
      const field = testTargetDoc.fields[0];
      field.typeOverride = FieldOverrideVariant.SAFE;

      WrapperActionService.revertOverride(field, namespaceMap);

      expect(FieldOverrideService.revertFieldTypeOverride).toHaveBeenCalledWith(field, namespaceMap);
    });

    it('should call revertFieldSubstitution when field is abstract with selectedMemberQName', () => {
      const testTargetDoc = TestUtil.createTargetOrderDoc();
      const field = testTargetDoc.fields[0];
      field.typeOverride = FieldOverrideVariant.NONE;
      field.wrapperKind = 'abstract';
      field.selectedMemberQName = new QName('http://test', 'Cat');

      WrapperActionService.revertOverride(field, namespaceMap);

      expect(FieldOverrideService.revertFieldSubstitution).toHaveBeenCalledWith(field, namespaceMap);
      expect(FieldOverrideService.revertFieldTypeOverride).not.toHaveBeenCalled();
    });
  });
});
