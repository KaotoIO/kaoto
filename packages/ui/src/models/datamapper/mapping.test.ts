import { DocumentDefinitionType, DocumentType } from './document';
import {
  ChooseItem,
  ForEachGroupItem,
  ForEachItem,
  GroupingStrategy,
  IfItem,
  isExpressionHolder,
  MappingTree,
  OtherwiseItem,
  SortItem,
  ValueSelector,
  ValueType,
  VariableItem,
  WhenItem,
} from './mapping';

describe('mapping.ts', () => {
  let tree: MappingTree;

  beforeEach(() => {
    tree = new MappingTree(DocumentType.TARGET_BODY, 'test', DocumentDefinitionType.XML_SCHEMA);
  });

  describe('isExpressionHolder()', () => {
    it('should return true for objects with an expression property', () => {
      expect(isExpressionHolder(new IfItem(tree))).toBe(true);
      expect(isExpressionHolder(new WhenItem(tree))).toBe(true);
      expect(isExpressionHolder(new ForEachItem(tree))).toBe(true);
      expect(isExpressionHolder(new ForEachGroupItem(tree))).toBe(true);
      expect(isExpressionHolder(new ValueSelector(tree))).toBe(true);
      expect(isExpressionHolder(new VariableItem(tree, 'myVar'))).toBe(true);
    });

    it('should return false for MappingItems without an expression property', () => {
      expect(isExpressionHolder(new ChooseItem(tree))).toBe(false);
      expect(isExpressionHolder(new OtherwiseItem(tree))).toBe(false);
    });
  });

  describe('IfItem', () => {
    it('clone() should copy expression and children', () => {
      const item = new IfItem(tree);
      item.expression = 'count($x) > 0';
      const child = new ValueSelector(item);
      child.expression = '$x/name';
      item.children = [child];

      const cloned = item.clone();

      expect(cloned.expression).toBe('count($x) > 0');
      expect(cloned.children).toHaveLength(1);
      expect((cloned.children[0] as ValueSelector).expression).toBe('$x/name');
      expect(cloned).not.toBe(item);
    });

    it('clone() should reparent cloned children to the cloned parent', () => {
      const item = new IfItem(tree);
      const child = new ValueSelector(item);
      item.children = [child];

      const cloned = item.clone();

      expect(cloned.children[0].parent).toBe(cloned);
      expect(cloned.children[0].parent).not.toBe(item);
    });
  });

  describe('ChooseItem', () => {
    it('doClone() should create a new ChooseItem with the same field', () => {
      const field = { id: 'testField', name: 'testField', isAttribute: false, fields: [], type: 'string' };
      const item = new ChooseItem(tree, field as never);
      const cloned = item.clone() as ChooseItem;

      expect(cloned).not.toBe(item);
      expect(cloned.field).toBe(field);
    });
  });

  describe('WhenItem', () => {
    it('clone() should copy expression and children', () => {
      const choose = new ChooseItem(tree);
      const item = new WhenItem(choose);
      item.expression = '@type = "express"';
      const child = new ValueSelector(item);
      child.expression = '$x/value';
      item.children = [child];

      const cloned = item.clone();

      expect(cloned.expression).toBe('@type = "express"');
      expect(cloned.children).toHaveLength(1);
      expect((cloned.children[0] as ValueSelector).expression).toBe('$x/value');
      expect(cloned).not.toBe(item);
    });
  });

  describe('OtherwiseItem', () => {
    it('doClone() should create a new OtherwiseItem', () => {
      const item = new OtherwiseItem(tree);
      const cloned = item.clone() as OtherwiseItem;

      expect(cloned).not.toBe(item);
      expect(cloned).toBeInstanceOf(OtherwiseItem);
    });
  });

  describe('ForEachItem', () => {
    it('doClone() should copy sortItems', () => {
      const item = new ForEachItem(tree);
      const sort = new SortItem();
      sort.expression = '@price';
      sort.order = 'descending';
      item.sortItems = [sort];

      const cloned = item.clone();

      expect(cloned.sortItems).toHaveLength(1);
      expect(cloned.sortItems[0].expression).toBe('@price');
      expect(cloned.sortItems[0].order).toBe('descending');
      expect(cloned.sortItems[0]).not.toBe(sort);
    });

    it('clone() should copy expression and children', () => {
      const item = new ForEachItem(tree);
      item.expression = '/Order/Items/Item';
      const child = new ValueSelector(item);
      child.expression = 'ItemId';
      item.children = [child];

      const cloned = item.clone();

      expect(cloned.expression).toBe('/Order/Items/Item');
      expect(cloned.children).toHaveLength(1);
      expect((cloned.children[0] as ValueSelector).expression).toBe('ItemId');
      expect(cloned).not.toBe(item);
    });

    it('contextPath getter should not mutate the original PathExpression', () => {
      const item = new ForEachItem(tree);
      item.expression = '/Order/Items/Item';

      const firstCall = item.contextPath;
      const secondCall = item.contextPath;

      expect(firstCall).not.toBe(secondCall);

      expect(firstCall?.pathSegments).toEqual(secondCall?.pathSegments);
      expect(firstCall?.isRelative).toBe(secondCall?.isRelative);
      expect(firstCall?.documentReferenceName).toBe(secondCall?.documentReferenceName);
    });
  });

  describe('ForEachGroupItem', () => {
    it('should default to GROUP_BY strategy with empty expressions', () => {
      const item = new ForEachGroupItem(tree);
      expect(item.groupingStrategy).toBe(GroupingStrategy.GROUP_BY);
      expect(item.groupingExpression).toBe('');
      expect(item.expression).toBe('');
    });

    it('doClone() should copy sortItems', () => {
      const item = new ForEachGroupItem(tree);
      const sort = new SortItem();
      sort.expression = '@price';
      sort.order = 'descending';
      item.sortItems = [sort];

      const cloned = item.clone();

      expect(cloned.sortItems).toHaveLength(1);
      expect(cloned.sortItems[0].expression).toBe('@price');
      expect(cloned.sortItems[0].order).toBe('descending');
      expect(cloned.sortItems[0]).not.toBe(sort);
    });

    it('clone() should copy expression, groupingStrategy, groupingExpression, and children', () => {
      const item = new ForEachGroupItem(tree);
      item.expression = '/Order/Items/Item';
      item.groupingStrategy = GroupingStrategy.GROUP_ADJACENT;
      item.groupingExpression = 'Category';
      const child = new ValueSelector(item);
      child.expression = 'ItemId';
      item.children = [child];

      const cloned = item.clone();

      expect(cloned.expression).toBe('/Order/Items/Item');
      expect(cloned.groupingStrategy).toBe(GroupingStrategy.GROUP_ADJACENT);
      expect(cloned.groupingExpression).toBe('Category');
      expect(cloned.children).toHaveLength(1);
      expect((cloned.children[0] as ValueSelector).expression).toBe('ItemId');
      expect(cloned).not.toBe(item);
    });

    it('contextPath getter should not mutate the original PathExpression', () => {
      const item = new ForEachGroupItem(tree);
      item.expression = '/Order/Items/Item';

      const firstCall = item.contextPath;
      const secondCall = item.contextPath;

      expect(firstCall).not.toBe(secondCall);

      expect(firstCall?.pathSegments).toEqual(secondCall?.pathSegments);
      expect(firstCall?.isRelative).toBe(secondCall?.isRelative);
      expect(firstCall?.documentReferenceName).toBe(secondCall?.documentReferenceName);
    });
  });

  describe('ValueSelector', () => {
    it('clone() should copy expression and valueType', () => {
      const item = new ValueSelector(tree, ValueType.ATTRIBUTE);
      item.expression = '/Order/@id';

      const cloned = item.clone();

      expect(cloned.expression).toBe('/Order/@id');
      expect(cloned.valueType).toBe(ValueType.ATTRIBUTE);
      expect(cloned).not.toBe(item);
    });
  });

  describe('VariableItem', () => {
    it('clone() should copy name, expression, and children', () => {
      const item = new VariableItem(tree, 'myVar');
      item.expression = '/Order/Id';
      const child = new ValueSelector(item);
      child.expression = 'ItemId';
      item.children = [child];

      const cloned = item.clone();

      expect(cloned.name).toBe('myVar');
      expect(cloned.expression).toBe('/Order/Id');
      expect(cloned.children).toHaveLength(1);
      expect((cloned.children[0] as ValueSelector).expression).toBe('ItemId');
      expect(cloned).not.toBe(item);
    });

    it('nodePath should be derived from parent nodePath and item id', () => {
      const item = new VariableItem(tree, 'myVar');

      expect(item.nodePath).toBeDefined();
      expect(item.nodePath.pathSegments).toContain(item.id);
    });
  });
});
