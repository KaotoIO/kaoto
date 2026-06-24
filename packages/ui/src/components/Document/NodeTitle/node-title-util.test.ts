import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import {
  ChooseItem,
  ForEachGroupItem,
  ForEachItem,
  GroupingStrategy,
  IfItem,
  MappingTree,
  UnknownMappingItem,
  ValueSelector,
  VariableItem,
  WhenItem,
} from '../../../models/datamapper/mapping';
import { VisualizationService } from '../../../services/visualization/visualization.service';
import { NodeTitleUtil } from './node-title-util';

describe('NodeTitleUtil.getMappingItemLabelInfo()', () => {
  const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);

  describe('UnknownMappingItem', () => {
    it('should return warning with xmlSnippet', () => {
      const element = document.createElementNS('http://www.w3.org/1999/XSL/Transform', 'apply-templates');
      element.setAttribute('select', '/ns0:Root/Item');
      const item = new UnknownMappingItem(tree, element);

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(true);
      expect(result.labelContent).toBe('unknown');
      expect(result.popoverHeader).toBe('Unsupported element detected');
      expect(result.xmlSnippet).toBeDefined();
    });

    it('should return the XML snippet via VisualizationService.formatXml', () => {
      const element = document.createElementNS('http://www.w3.org/1999/XSL/Transform', 'apply-templates');
      element.setAttribute('select', '/Root');
      const formatted = VisualizationService.formatXml(element);
      const item = new UnknownMappingItem(tree, element);

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.xmlSnippet).toBe(formatted);
    });
  });

  describe('VariableItem', () => {
    it('should show warning when expression is empty and no children', () => {
      const item = new VariableItem(tree, 'myVar');

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(true);
      expect(result.labelContent).toBe('$');
      expect(result.popoverHeader).toBe('Variable value is not configured');
      expect(result.warnings).toBeDefined();
    });

    it('should not warn when expression is set', () => {
      const item = new VariableItem(tree, 'myVar');
      item.expression = 'some-xpath';

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(false);
      expect(result.labelContent).toBe('$');
      expect(result.popoverHeader).toBeUndefined();
      expect(result.warnings).toBeUndefined();
    });

    it('should not warn when children exist', () => {
      const item = new VariableItem(tree, 'myVar');
      item.children.push(new ValueSelector(item));

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(false);
    });

    it('should include titleText with variable name', () => {
      const item = new VariableItem(tree, 'myVar');
      item.expression = 'x';

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.titleText).toBe('myVar');
    });
  });

  describe('ForEachGroupItem', () => {
    it('should not warn when fully configured', () => {
      const item = new ForEachGroupItem(tree);
      item.expression = '/Orders/Order';
      item.groupingStrategy = GroupingStrategy.GROUP_BY;
      item.groupingExpression = 'Category';

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(false);
      expect(result.labelContent).toBe('for-each-group');
      expect(result.popoverHeader).toBe('Group By');
    });

    it('should return strategy and expression data when configured', () => {
      const item = new ForEachGroupItem(tree);
      item.expression = '/Orders/Order';
      item.groupingStrategy = GroupingStrategy.GROUP_ADJACENT;
      item.groupingExpression = '@type';

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.strategyLabel).toBe('Group Adjacent');
      expect(result.groupingExpression).toBe('@type');
    });

    it('should warn when select expression is missing', () => {
      const item = new ForEachGroupItem(tree);
      item.groupingExpression = 'Category';

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(true);
      expect(result.popoverHeader).toBe('missing configuration');
      expect(result.warnings).toContain('Select expression is not configured');
    });

    it('should warn when grouping expression is missing', () => {
      const item = new ForEachGroupItem(tree);
      item.expression = '/Orders/Order';

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(true);
      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/Grouping is not configured/)]));
    });

    it('should show both warnings when both are missing', () => {
      const item = new ForEachGroupItem(tree);

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(true);
      expect(result.warnings).toContain('Select expression is not configured');
      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/Grouping is not configured/)]));
    });

    it('should use correct strategy labels for all strategies', () => {
      const strategies = [
        { strategy: GroupingStrategy.GROUP_BY, label: 'Group By' },
        { strategy: GroupingStrategy.GROUP_ADJACENT, label: 'Group Adjacent' },
        { strategy: GroupingStrategy.GROUP_STARTING_WITH, label: 'Group Starting With' },
        { strategy: GroupingStrategy.GROUP_ENDING_WITH, label: 'Group Ending With' },
      ];

      for (const { strategy, label } of strategies) {
        const item = new ForEachGroupItem(tree);
        item.expression = '/x';
        item.groupingStrategy = strategy;
        item.groupingExpression = 'y';

        const result = NodeTitleUtil.getMappingItemLabelInfo(item);

        expect(result.popoverHeader).toBe(label);
      }
    });
  });

  describe('ForEachItem', () => {
    it('should warn when expression is empty', () => {
      const item = new ForEachItem(tree);

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(true);
      expect(result.labelContent).toBe('for-each');
      expect(result.popoverHeader).toBe('Select expression is not configured');
    });

    it('should not warn when expression is set', () => {
      const item = new ForEachItem(tree);
      item.expression = '/Orders/Order';

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(false);
      expect(result.labelContent).toBe('for-each');
    });
  });

  describe('IfItem', () => {
    it('should warn when expression is empty', () => {
      const item = new IfItem(tree);

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(true);
      expect(result.labelContent).toBe('if');
      expect(result.popoverHeader).toBe('Test expression is not configured');
    });

    it('should not warn when expression is set', () => {
      const item = new IfItem(tree);
      item.expression = 'count(x) > 0';

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(false);
      expect(result.labelContent).toBe('if');
    });
  });

  describe('WhenItem', () => {
    it('should warn when expression is empty', () => {
      const chooseItem = new ChooseItem(tree);
      const item = new WhenItem(chooseItem);

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(true);
      expect(result.labelContent).toBe('when');
      expect(result.popoverHeader).toBe('Test expression is not configured');
    });

    it('should not warn when expression is set', () => {
      const chooseItem = new ChooseItem(tree);
      const item = new WhenItem(chooseItem);
      item.expression = '@status = "active"';

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(false);
      expect(result.labelContent).toBe('when');
    });
  });

  describe('default case', () => {
    it('should return no warning for a generic mapping item', () => {
      const item = new ForEachItem(tree);
      item.expression = 'configured';

      const result = NodeTitleUtil.getMappingItemLabelInfo(item);

      expect(result.isWarning).toBe(false);
      expect(result.labelContent).toBe('for-each');
      expect(result.popoverHeader).toBeUndefined();
      expect(result.warnings).toBeUndefined();
      expect(result.titleText).toBeUndefined();
    });
  });
});
