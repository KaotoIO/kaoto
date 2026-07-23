import { DocumentDefinitionType, DocumentType, IField } from '../../models/datamapper/document';
import { IAbstractMenuGroupsConfig } from '../../models/datamapper/field-action';
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

vi.mock('../document/document-util.service', () => ({
  DocumentUtilService: {
    getSelectedMember: vi.fn(),
    invalidateDescendants: vi.fn(),
    processOverrides: vi.fn(),
  },
}));

vi.mock('../document/wrapper-selection.service', () => ({
  WrapperSelectionService: {
    clearChoiceSelection: vi.fn(),
    findParentWrapper: vi.fn().mockReturnValue(undefined),
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

describe('WrapperActionService (abstract)', () => {
  const namespaceMap = { xs: 'http://www.w3.org/2001/XMLSchema' };

  beforeEach(() => {
    vi.clearAllMocks();
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
      expect(MappingService.updateFieldItemField).toHaveBeenCalledWith(fieldItem, childField);
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
      expect(MappingService.updateFieldItemField).toHaveBeenCalledWith(fieldItem, wrapperField);
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

  describe('clearAbstractSubstitution / choice>abstract cascade (#3532)', () => {
    it('should cascade clear to parent choice when document-level maxOccurs=1', () => {
      const ownerDocument = TestUtil.createTargetOrderDoc();
      const parentChoiceField = mockField({ wrapperKind: 'choice', ownerDocument });
      const wrapperField = mockField({ maxOccurs: 1, ownerDocument, parent: parentChoiceField });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, wrapperField);
      const nodeData = createTargetFieldNodeData(wrapperField, fieldItem);

      vi.mocked(WrapperSelectionService.findParentWrapper).mockReturnValue(parentChoiceField);

      WrapperActionService.clearAbstractSubstitution(nodeData, wrapperField, namespaceMap, true);

      expect(FieldOverrideService.revertFieldSubstitution).toHaveBeenCalledWith(wrapperField, namespaceMap);
      expect(WrapperSelectionService.clearChoiceSelection).toHaveBeenCalledWith(
        ownerDocument,
        parentChoiceField,
        namespaceMap,
      );
    });

    it('should cascade clear to parent choice when document-level source maxOccurs>1', () => {
      const ownerDocument = TestUtil.createTargetOrderDoc();
      const parentChoiceField = mockField({ wrapperKind: 'choice', ownerDocument });
      const wrapperField = mockField({ maxOccurs: -1, ownerDocument, parent: parentChoiceField });
      const nodeData = {} as FieldNodeData;

      vi.mocked(WrapperSelectionService.findParentWrapper).mockReturnValue(parentChoiceField);

      WrapperActionService.clearAbstractSubstitution(nodeData, wrapperField, namespaceMap, false);

      expect(FieldOverrideService.revertFieldSubstitution).toHaveBeenCalledWith(wrapperField, namespaceMap);
      expect(WrapperSelectionService.clearChoiceSelection).toHaveBeenCalledWith(
        ownerDocument,
        parentChoiceField,
        namespaceMap,
      );
    });

    it('should NOT cascade for per-instance clear (target maxOccurs>1)', () => {
      const wrapperField = mockField({ maxOccurs: -1 });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, wrapperField);
      const nodeData = createFieldItemNodeData(fieldItem);

      WrapperActionService.clearAbstractSubstitution(nodeData, wrapperField, namespaceMap, true);

      expect(WrapperSelectionService.clearChoiceSelection).not.toHaveBeenCalled();
    });

    it('should NOT cascade when no choice parent', () => {
      const ownerDocument = TestUtil.createTargetOrderDoc();
      const wrapperField = mockField({ maxOccurs: 1, ownerDocument });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, wrapperField);
      const nodeData = createTargetFieldNodeData(wrapperField, fieldItem);

      vi.mocked(WrapperSelectionService.findParentWrapper).mockReturnValue(undefined);

      WrapperActionService.clearAbstractSubstitution(nodeData, wrapperField, namespaceMap, true);

      expect(FieldOverrideService.revertFieldSubstitution).toHaveBeenCalledWith(wrapperField, namespaceMap);
      expect(WrapperSelectionService.clearChoiceSelection).not.toHaveBeenCalled();
    });
  });

  describe('buildMenuGroupsForAbstractNode', () => {
    function baseAbstractConfig(overrides: Partial<IAbstractMenuGroupsConfig> = {}): IAbstractMenuGroupsConfig {
      return {
        isAbstractWrapper: false,
        isAbstractWrapperMember: false,
        isInsideChoiceWrapper: false,
        isSelectedSubstitution: false,
        candidates: {},
        selectedQName: undefined,
        memberSelectedQName: undefined,
        selectSelfAction: undefined,
        clearSubstitutionAction: { label: 'Clear', onClick: vi.fn() },
        changeSubstituteAction: { label: 'Change', onClick: vi.fn() },
        onSelectSubstitution: vi.fn(),
        onOpenSubstitutionModal: vi.fn(),
        selectedIcon: 'selected-icon',
        unselectedIcon: 'unselected-icon',
        ...overrides,
      };
    }

    it('should return clear action when abstract wrapper inside choice has selection', () => {
      const clearAction = { label: 'Clear', onClick: vi.fn() };
      const config = baseAbstractConfig({
        isAbstractWrapper: true,
        isInsideChoiceWrapper: true,
        selectedQName: 'ns:Cat',
        clearSubstitutionAction: clearAction,
      });

      const groups = WrapperActionService.buildMenuGroupsForAbstractNode(config);

      expect(groups).toHaveLength(1);
      expect(groups[0].actions).toEqual([clearAction]);
    });

    it('should return empty when abstract wrapper inside choice has no selection', () => {
      const config = baseAbstractConfig({
        isAbstractWrapper: true,
        isInsideChoiceWrapper: true,
        selectedQName: undefined,
      });

      const groups = WrapperActionService.buildMenuGroupsForAbstractNode(config);

      expect(groups).toEqual([]);
    });

    it('should build inline substitution actions when candidates <= 10', () => {
      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue({});
      const config = baseAbstractConfig({
        isAbstractWrapper: true,
        candidates: {
          'ns:Cat': mockSubstituteInfo('Cat'),
          'ns:Dog': mockSubstituteInfo('Dog'),
        },
        selectedQName: 'ns:Cat',
        selectSelfAction: { label: 'Select self', onClick: vi.fn() },
      });

      const groups = WrapperActionService.buildMenuGroupsForAbstractNode(config);

      expect(groups).toHaveLength(3);
      expect(groups[0].actions[0].label).toBe('Select self');
      expect(groups[1].actions).toHaveLength(2);
      expect(groups[1].actions[0].label).toBe('Cat');
      expect(groups[1].actions[0].icon).toBe('selected-icon');
      expect(groups[1].actions[1].label).toBe('Dog');
      expect(groups[1].actions[1].icon).toBe('unselected-icon');
      expect(groups[2].actions[0].label).toBe('Clear');
    });

    it('should show modal button when candidates > 10', () => {
      const candidates: Record<string, IFieldSubstituteInfo> = {};
      for (let i = 0; i < 11; i++) {
        candidates[`ns:Type${i}`] = mockSubstituteInfo(`Type${i}`);
      }
      const config = baseAbstractConfig({
        isAbstractWrapper: true,
        candidates,
      });

      const groups = WrapperActionService.buildMenuGroupsForAbstractNode(config);

      expect(groups[1].actions).toHaveLength(1);
      expect(groups[1].actions[0].label).toBe('Select Substitute...');
      expect(groups[1].actions[0].testId).toBe('open-substitution-modal');
    });

    it('should return empty when no candidates and no selectSelfAction', () => {
      const config = baseAbstractConfig({
        isAbstractWrapper: true,
        candidates: {},
        selectSelfAction: undefined,
      });

      const groups = WrapperActionService.buildMenuGroupsForAbstractNode(config);

      expect(groups).toEqual([]);
    });

    it('should omit selectSelfAction for abstract wrapper members', () => {
      const config = baseAbstractConfig({
        isAbstractWrapperMember: true,
        candidates: { 'ns:Cat': mockSubstituteInfo('Cat') },
        selectSelfAction: { label: 'Select self', onClick: vi.fn() },
      });

      const groups = WrapperActionService.buildMenuGroupsForAbstractNode(config);

      expect(groups[0].actions).toHaveLength(0);
    });

    it('should return clear and change actions for selected substitution', () => {
      const clearAction = { label: 'Clear', onClick: vi.fn() };
      const changeAction = { label: 'Change', onClick: vi.fn() };
      const config = baseAbstractConfig({
        isSelectedSubstitution: true,
        clearSubstitutionAction: clearAction,
        changeSubstituteAction: changeAction,
      });

      const groups = WrapperActionService.buildMenuGroupsForAbstractNode(config);

      expect(groups).toHaveLength(1);
      expect(groups[0].actions).toEqual([clearAction, changeAction]);
    });
  });
});
