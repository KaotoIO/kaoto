import { DocumentDefinitionType, DocumentType, IField } from '../../models/datamapper/document';
import { IChoiceMenuGroupsConfig, IWrapperCandidate } from '../../models/datamapper/field-action';
import { FieldItem, MappingTree } from '../../models/datamapper/mapping';
import { FieldOverrideVariant, IFieldSubstituteInfo, Types } from '../../models/datamapper/types';
import {
  FieldItemNodeData,
  FieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../models/datamapper/visualization';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { QName } from '../../xml-schema-ts/QName';
import { DocumentUtilService } from '../document/document-util.service';
import { FieldOverrideService } from '../document/field-override.service';
import { WrapperSelectionService } from '../document/wrapper-selection.service';
import { MappingService } from '../mapping/mapping.service';
import { ChoiceFieldService } from './choice-field.service';
import { MappingActionService } from './mapping-action.service';
import { VisualizationService } from './visualization.service';

vi.mock('../document/field-override.service', () => ({
  FieldOverrideService: {
    revertFieldTypeOverride: vi.fn(),
    revertFieldSubstitution: vi.fn(),
    getFieldSubstitutionCandidates: vi.fn().mockReturnValue({}),
    applyFieldSubstitution: vi.fn(),
  },
}));

vi.mock('./visualization.service', () => ({
  VisualizationService: {
    getChoiceMemberLabel: vi.fn().mockReturnValue('choice-label'),
  },
}));

vi.mock('../document/document-util.service', () => ({
  DocumentUtilService: {
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

describe('ChoiceFieldService', () => {
  const namespaceMap = { xs: 'http://www.w3.org/2001/XMLSchema' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fieldToCandidate', () => {
    it('should use getChoiceMemberLabel for choice wrapper fields', () => {
      const field = mockField({ wrapperKind: 'choice', type: Types.Container });
      vi.mocked(VisualizationService.getChoiceMemberLabel).mockReturnValue('(email | phone)');

      const result = ChoiceFieldService.fieldToCandidate(field, 'key1', 0);

      expect(result.label).toBe('(email | phone)');
      expect(VisualizationService.getChoiceMemberLabel).toHaveBeenCalledWith(field);
    });

    it('should use displayName for non-choice fields', () => {
      const field = mockField({ displayName: 'EmailAddress', type: Types.String });

      const result = ChoiceFieldService.fieldToCandidate(field, 'key1', 2);

      expect(result.label).toBe('EmailAddress');
      expect(result.typeBadge).toBe(Types.String);
      expect(result.selection).toEqual({ memberIndex: 2 });
    });

    it('should fall back to name when displayName is empty', () => {
      const field = mockField({ displayName: '', name: 'fallbackName' });

      const result = ChoiceFieldService.fieldToCandidate(field, 'key1', 0);

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

      const result = ChoiceFieldService.fieldToCandidate(field, 'key1', 0);

      expect(result.childrenPreview).toEqual(['A', 'B', 'C']);
    });

    it('should return undefined childrenPreview for field with no children', () => {
      const field = mockField({ fields: [] });

      const result = ChoiceFieldService.fieldToCandidate(field, 'key1', 0);

      expect(result.childrenPreview).toBeUndefined();
    });

    it('should use getChoiceMemberLabel for sequence wrapper fields', () => {
      const field = mockField({
        wrapperKind: 'sequence',
        type: Types.Container,
        fields: [mockField({ name: 'key', displayName: 'key' }), mockField({ name: 'value', displayName: 'value' })],
      });
      vi.mocked(VisualizationService.getChoiceMemberLabel).mockReturnValue('(key | value)');

      const result = ChoiceFieldService.fieldToCandidate(field, '2', 2);

      expect(result.label).toBe('(key | value)');
      expect(result.typeBadge).toBe(Types.Container);
      expect(result.selection).toEqual({ memberIndex: 2 });
      expect(VisualizationService.getChoiceMemberLabel).toHaveBeenCalledWith(field);
    });
  });

  describe('dissolveChoiceMembers', () => {
    it('should dissolve abstract members into substitution candidates', () => {
      const abstractMember = mockField({ wrapperKind: 'abstract' });
      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue({
        'ns:Cat': mockSubstituteInfo('Cat'),
        'ns:Dog': mockSubstituteInfo('Dog'),
      });

      const result = ChoiceFieldService.dissolveChoiceMembers([abstractMember], namespaceMap);

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

    it('should produce one candidate for a sequence member with dissolved label', () => {
      const sequenceMember = mockField({
        wrapperKind: 'sequence',
        type: Types.Container,
        fields: [mockField({ name: 'key', displayName: 'key' }), mockField({ name: 'value', displayName: 'value' })],
      });
      vi.mocked(VisualizationService.getChoiceMemberLabel).mockReturnValue('(key | value)');

      const result = ChoiceFieldService.dissolveChoiceMembers([sequenceMember], namespaceMap);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          key: '0',
          label: '(key | value)',
          typeBadge: Types.Container,
          selection: { memberIndex: 0 },
        }),
      );
      expect(result[0].childrenPreview).toEqual(['key', 'value']);
    });

    it('should pass through normal members via fieldToCandidate', () => {
      const normalMember = mockField({ name: 'email', displayName: 'Email', type: Types.String });

      const result = ChoiceFieldService.dissolveChoiceMembers([normalMember], namespaceMap);

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
      const sequence = mockField({
        wrapperKind: 'sequence',
        fields: [mockField({ name: 'key', displayName: 'key' }), mockField({ name: 'value', displayName: 'value' })],
      });
      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue({
        'ns:Cat': mockSubstituteInfo('Cat'),
      });
      vi.mocked(VisualizationService.getChoiceMemberLabel).mockReturnValue('(key | value)');

      const result = ChoiceFieldService.dissolveChoiceMembers([normal, abstract, sequence], namespaceMap);

      expect(result).toHaveLength(3);
      expect(result[0].key).toBe('0');
      expect(result[0].selection.memberIndex).toBe(0);
      expect(result[1].key).toBe('1:ns:Cat');
      expect(result[1].selection.memberIndex).toBe(1);
      expect(result[2].key).toBe('2');
      expect(result[2].selection.memberIndex).toBe(2);
    });
  });

  describe('dissolveChoiceMembers (additional)', () => {
    it('should include children preview for complex members', () => {
      const member = mockField({
        name: 'address',
        displayName: 'Address',
        type: Types.Container,
        fields: [mockField({ displayName: 'Street' }), mockField({ displayName: 'City' })],
      });
      const result = ChoiceFieldService.dissolveChoiceMembers([member], namespaceMap);

      expect(result[0].childrenPreview).toEqual(['Street', 'City']);
    });

    it('should handle empty members list', () => {
      expect(ChoiceFieldService.dissolveChoiceMembers([], namespaceMap)).toEqual([]);
    });
  });

  describe('getChoiceFieldDisplayName', () => {
    it('should use getChoiceMemberLabel for choice wrapper', () => {
      const field = mockField({ wrapperKind: 'choice' });
      vi.mocked(VisualizationService.getChoiceMemberLabel).mockReturnValue('(A | B)');

      const result = ChoiceFieldService.getChoiceFieldDisplayName(field);

      expect(result).toBe('(A | B)');
      expect(VisualizationService.getChoiceMemberLabel).toHaveBeenCalledWith(field);
    });

    it('should use displayName for non-choice field', () => {
      const field = mockField({ displayName: 'MyField' });

      const result = ChoiceFieldService.getChoiceFieldDisplayName(field);

      expect(result).toBe('MyField');
    });

    it('should fall back to name when displayName is empty', () => {
      const field = mockField({ displayName: '', name: 'fallback' });

      const result = ChoiceFieldService.getChoiceFieldDisplayName(field);

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

      ChoiceFieldService.dispatchChoiceSelection(nodeData, wrapper, { memberIndex: 0 }, namespaceMap, true);

      expect(WrapperSelectionService.setChoiceSelection).not.toHaveBeenCalled();
      expect(MappingService.updateFieldItemField).toHaveBeenCalledWith(fieldItem, memberField);
    });

    it('should route to document-level otherwise', () => {
      const ownerDocument = TestUtil.createTargetOrderDoc();
      const wrapper = mockField({ maxOccurs: 1, ownerDocument });
      const nodeData = {} as FieldNodeData;

      ChoiceFieldService.dispatchChoiceSelection(nodeData, wrapper, { memberIndex: 0 }, namespaceMap, false);

      expect(WrapperSelectionService.setChoiceSelection).toHaveBeenCalledWith(ownerDocument, wrapper, 0, namespaceMap);
    });
  });

  describe('clearChoiceSelectionOnField', () => {
    it('should route to per-instance when target side and maxOccurs > 1', () => {
      const wrapper = mockField({ maxOccurs: -1 });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, wrapper);
      const nodeData = createFieldItemNodeData(fieldItem);

      ChoiceFieldService.clearChoiceSelectionOnField(nodeData, wrapper, namespaceMap, true);

      expect(WrapperSelectionService.clearChoiceSelection).not.toHaveBeenCalled();
      expect(MappingService.updateFieldItemField).toHaveBeenCalledWith(fieldItem, wrapper);
    });

    it('should route to document-level when source side', () => {
      const ownerDocument = TestUtil.createTargetOrderDoc();
      const wrapper = mockField({ maxOccurs: 1, ownerDocument });
      const nodeData = {} as FieldNodeData;

      ChoiceFieldService.clearChoiceSelectionOnField(nodeData, wrapper, namespaceMap, false);

      expect(WrapperSelectionService.clearDescendantWrapperSelections).toHaveBeenCalledWith(wrapper, namespaceMap);
      expect(DocumentUtilService.invalidateDescendants).toHaveBeenCalled();
      expect(WrapperSelectionService.clearChoiceSelection).toHaveBeenCalledWith(ownerDocument, wrapper, namespaceMap);
    });

    it('should route to document-level when maxOccurs is 1 and target side', () => {
      const ownerDocument = TestUtil.createTargetOrderDoc();
      const wrapper = mockField({ maxOccurs: 1, ownerDocument });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, wrapper);
      const nodeData = createTargetFieldNodeData(wrapper, fieldItem);

      ChoiceFieldService.clearChoiceSelectionOnField(nodeData, wrapper, namespaceMap, true);

      expect(WrapperSelectionService.clearDescendantWrapperSelections).toHaveBeenCalledWith(wrapper, namespaceMap);
      expect(DocumentUtilService.invalidateDescendants).toHaveBeenCalled();
      expect(WrapperSelectionService.clearChoiceSelection).toHaveBeenCalledWith(ownerDocument, wrapper, namespaceMap);
    });
  });

  describe('resolveChoiceWrapper', () => {
    it('should return choiceWrapperMemberField when isChoiceWrapperMember is true', () => {
      const choiceField = mockField({ wrapperKind: 'choice' });
      const fallback = mockField();

      const result = ChoiceFieldService.resolveChoiceWrapper(true, choiceField, fallback);

      expect(result).toBe(choiceField);
    });

    it('should return fallback when isChoiceWrapperMember is false', () => {
      const choiceField = mockField({ wrapperKind: 'choice' });
      const fallback = mockField();

      const result = ChoiceFieldService.resolveChoiceWrapper(false, choiceField, fallback);

      expect(result).toBe(fallback);
    });
  });

  describe('resolveMemberSelectedKey', () => {
    it('should return null when nodeData is not FieldItemNodeData', () => {
      const nodeData = {} as FieldNodeData;

      const result = ChoiceFieldService.resolveMemberSelectedKey(nodeData, mockField(), [], namespaceMap);

      expect(result).toBeNull();
    });

    it('should return null when wrapper is undefined', () => {
      const field = mockField();
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, field);
      const nodeData = createFieldItemNodeData(fieldItem);

      const result = ChoiceFieldService.resolveMemberSelectedKey(nodeData, undefined, [], namespaceMap);

      expect(result).toBeNull();
    });

    it('should return null when member field not in wrapper.fields and no parent', () => {
      const memberField = mockField({ name: 'unknown' });
      const wrapper = mockField({ fields: [] });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, memberField);
      const nodeData = createFieldItemNodeData(fieldItem);

      const result = ChoiceFieldService.resolveMemberSelectedKey(nodeData, wrapper, [], namespaceMap);

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

      const result = ChoiceFieldService.resolveMemberSelectedKey(nodeData, wrapper, dissolved, namespaceMap);

      expect(result).toBe('0:ns:Cat');
    });

    it('should return matching dissolved key when idx >= 0', () => {
      const memberField = mockField({ name: 'email' });
      const wrapper = mockField({ fields: [memberField] });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, memberField);
      const nodeData = createFieldItemNodeData(fieldItem);
      const dissolved = [{ key: '0', label: 'Email', typeBadge: Types.String, selection: { memberIndex: 0 } }];

      const result = ChoiceFieldService.resolveMemberSelectedKey(nodeData, wrapper, dissolved, namespaceMap);

      expect(result).toBe('0');
    });

    it('should return null when idx >= 0 but no dissolved match', () => {
      const memberField = mockField({ name: 'email' });
      const wrapper = mockField({ fields: [memberField] });
      const tree = createMappingTree();
      const fieldItem = new FieldItem(tree, memberField);
      const nodeData = createFieldItemNodeData(fieldItem);

      const result = ChoiceFieldService.resolveMemberSelectedKey(nodeData, wrapper, [], namespaceMap);

      expect(result).toBeNull();
    });
  });

  describe('resolveSelectedModalKey', () => {
    it('should return memberSelectedKey when isChoiceWrapperMember is true', () => {
      const result = ChoiceFieldService.resolveSelectedModalKey(true, 'key1', undefined, []);

      expect(result).toBe('key1');
    });

    it('should return null when selectedMemberIndex is undefined', () => {
      const wrapper = mockField();

      const result = ChoiceFieldService.resolveSelectedModalKey(false, null, wrapper, []);

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

      const result = ChoiceFieldService.resolveSelectedModalKey(false, null, wrapper, dissolved);

      expect(result).toBe('0:ns:Cat');
    });

    it('should match dissolved without substituteQName for normal member', () => {
      const normalMember = mockField({ name: 'email' });
      const wrapper = mockField({ selectedMemberIndex: 0, fields: [normalMember] });
      const dissolved = [{ key: '0', label: 'Email', typeBadge: Types.String, selection: { memberIndex: 0 } }];

      const result = ChoiceFieldService.resolveSelectedModalKey(false, null, wrapper, dissolved);

      expect(result).toBe('0');
    });

    it('should return null when no dissolved candidate matches', () => {
      const normalMember = mockField({ name: 'email' });
      const wrapper = mockField({ selectedMemberIndex: 0, fields: [normalMember] });

      const result = ChoiceFieldService.resolveSelectedModalKey(false, null, wrapper, []);

      expect(result).toBeNull();
    });
  });

  describe('buildMenuGroups', () => {
    function baseChoiceConfig(overrides: Partial<IChoiceMenuGroupsConfig> = {}): IChoiceMenuGroupsConfig {
      return {
        isChoiceWrapper: false,
        isChoiceWrapperMember: false,
        isNestedSelectedChoice: false,
        isSelectedChoice: false,
        dissolved: [],
        selectedModalKey: null,
        selectSelfAction: undefined,
        clearChoiceAction: { label: 'Clear choice', onClick: vi.fn() },
        changeMemberAction: { label: 'Change member', onClick: vi.fn() },
        onSelectChoiceMember: vi.fn(),
        onOpenChoiceModal: vi.fn(),
        selectedIcon: 'selected-icon',
        unselectedIcon: 'unselected-icon',
        ...overrides,
      };
    }

    function makeDissolved(count: number): IWrapperCandidate[] {
      return Array.from({ length: count }, (_, i) => ({
        key: `${i}`,
        label: `Member${i}`,
        typeBadge: Types.String,
        selection: { memberIndex: i },
      }));
    }

    it('should build inline member actions when dissolved <= 10', () => {
      const config = baseChoiceConfig({
        isChoiceWrapper: true,
        dissolved: makeDissolved(3),
        selectedModalKey: '1',
        selectSelfAction: { label: 'Select self', onClick: vi.fn() },
      });

      const groups = ChoiceFieldService.buildMenuGroups(config);

      expect(groups).toHaveLength(3);
      expect(groups[0].actions[0].label).toBe('Select self');
      expect(groups[1].actions).toHaveLength(3);
      expect(groups[1].actions[0].icon).toBe('unselected-icon');
      expect(groups[1].actions[1].icon).toBe('selected-icon');
      expect(groups[2].actions[0].label).toBe('Clear choice');
    });

    it('should show modal button when dissolved > 10', () => {
      const config = baseChoiceConfig({
        isChoiceWrapper: true,
        dissolved: makeDissolved(11),
      });

      const groups = ChoiceFieldService.buildMenuGroups(config);

      expect(groups[1].actions).toHaveLength(1);
      expect(groups[1].actions[0].label).toBe('Select Member...');
      expect(groups[1].actions[0].testId).toBe('open-choice-modal');
    });

    it('should omit selectSelfAction for choice wrapper members', () => {
      const config = baseChoiceConfig({
        isChoiceWrapperMember: true,
        dissolved: makeDissolved(2),
        selectSelfAction: { label: 'Select self', onClick: vi.fn() },
      });

      const groups = ChoiceFieldService.buildMenuGroups(config);

      expect(groups[0].actions).toHaveLength(0);
    });

    it('should add clear+change group when isNestedSelectedChoice', () => {
      const clearAction = { label: 'Clear choice', onClick: vi.fn() };
      const changeAction = { label: 'Change member', onClick: vi.fn() };
      const config = baseChoiceConfig({
        isChoiceWrapper: true,
        isNestedSelectedChoice: true,
        dissolved: makeDissolved(2),
        clearChoiceAction: clearAction,
        changeMemberAction: changeAction,
      });

      const groups = ChoiceFieldService.buildMenuGroups(config);

      const lastGroup = groups[groups.length - 1];
      expect(lastGroup.actions).toEqual([clearAction, changeAction]);
    });

    it('should return clear+change for selected choice (non-wrapper)', () => {
      const clearAction = { label: 'Clear choice', onClick: vi.fn() };
      const changeAction = { label: 'Change member', onClick: vi.fn() };
      const config = baseChoiceConfig({
        isSelectedChoice: true,
        clearChoiceAction: clearAction,
        changeMemberAction: changeAction,
      });

      const groups = ChoiceFieldService.buildMenuGroups(config);

      expect(groups).toHaveLength(1);
      expect(groups[0].actions).toEqual([clearAction, changeAction]);
    });

    it('should return empty when dissolved is empty and no selectSelfAction', () => {
      const config = baseChoiceConfig({
        isChoiceWrapper: true,
        dissolved: [],
        selectSelfAction: undefined,
      });

      const groups = ChoiceFieldService.buildMenuGroups(config);

      expect(groups).toEqual([]);
    });

    it('should include selectSelfAction for selected choice', () => {
      const selectSelf = { label: 'Select self', onClick: vi.fn() };
      const config = baseChoiceConfig({
        isSelectedChoice: true,
        selectSelfAction: selectSelf,
      });

      const groups = ChoiceFieldService.buildMenuGroups(config);

      expect(groups[0].actions).toContainEqual(selectSelf);
    });
  });
});
