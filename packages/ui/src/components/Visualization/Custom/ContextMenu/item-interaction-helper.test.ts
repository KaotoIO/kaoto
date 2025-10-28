import {
  findOnDeleteModalCustomizationRecursively,
  processOnCopyAddon,
  processOnDeleteAddonRecursively,
  processOnDuplicateAddonRecursively,
  processOnPasteAddon,
} from './item-interaction-helper';
import { createVisualizationNode } from '../../../../models';
import {
  IInteractionType,
  IModalCustomization,
  IOnCopyAddon,
  IOnDeleteAddon,
  IOnDuplicateAddon,
  IOnPasteAddon,
  IRegisteredInteractionAddon,
} from '../../../registers/interactions/node-interaction-addon.model';
import { ACTION_ID_CONFIRM } from '../../../../providers';
import { SourceSchemaType } from '../../../../models/camel/source-schema-type';
import { ButtonVariant } from '@patternfly/react-core';

describe('item-interaction-helper', () => {
  describe('processOnDeleteAddonRecursively', () => {
    it('should process children', () => {
      const addons: Record<string, IRegisteredInteractionAddon[]> = {};
      const vizNode = createVisualizationNode('test', {});
      const childVn = createVisualizationNode('child', {});
      const mockAddon: IRegisteredInteractionAddon = {
        type: IInteractionType.ON_DELETE,
        activationFn: () => true,
        callback: jest.fn(),
      };
      addons[childVn.id] = [mockAddon];
      vizNode.addChild(childVn);
      processOnDeleteAddonRecursively(vizNode, ACTION_ID_CONFIRM, (vn) => (addons[vn.id] ?? []) as IOnDeleteAddon[]);
      expect(mockAddon.callback).toHaveBeenCalled();
    });
  });

  describe('findOnDeleteModalCustomizationRecursively', () => {
    it('should collect modal customizations from addons', () => {
      const mockCustomization: IModalCustomization = {
        buttonOptions: {
          [ACTION_ID_CONFIRM]: {
            variant: ButtonVariant.danger,
            buttonText: 'Delete',
          },
        },
        additionalText: 'Are you sure?',
      };

      const vizNode = createVisualizationNode('test', {});
      const mockAddon: IOnDeleteAddon = {
        type: IInteractionType.ON_DELETE,
        activationFn: () => true,
        callback: jest.fn(),
        modalCustomization: mockCustomization,
      };

      const result = findOnDeleteModalCustomizationRecursively(vizNode, () => [mockAddon]);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockCustomization);
    });

    it('should collect modal customizations from children recursively', () => {
      const parentCustomization: IModalCustomization = {
        buttonOptions: {
          [ACTION_ID_CONFIRM]: {
            variant: ButtonVariant.danger,
            buttonText: 'Delete Parent',
          },
        },
        additionalText: 'Delete parent?',
      };
      const childCustomization: IModalCustomization = {
        buttonOptions: {
          [ACTION_ID_CONFIRM]: {
            variant: ButtonVariant.danger,
            buttonText: 'Delete Child',
          },
        },
        additionalText: 'Delete child?',
      };

      const parentNode = createVisualizationNode('parent', {});
      const childNode = createVisualizationNode('child', {});
      parentNode.addChild(childNode);

      const parentAddon: IOnDeleteAddon = {
        type: IInteractionType.ON_DELETE,
        activationFn: () => true,
        callback: jest.fn(),
        modalCustomization: parentCustomization,
      };
      const childAddon: IOnDeleteAddon = {
        type: IInteractionType.ON_DELETE,
        activationFn: () => true,
        callback: jest.fn(),
        modalCustomization: childCustomization,
      };

      const addons: Record<string, IOnDeleteAddon[]> = {
        parent: [parentAddon],
        child: [childAddon],
      };

      const result = findOnDeleteModalCustomizationRecursively(parentNode, (vn) => addons[vn.id] || []);

      expect(result).toHaveLength(2);
      expect(result).toContain(parentCustomization);
      expect(result).toContain(childCustomization);
    });

    it('should deduplicate modal customizations', () => {
      const sharedCustomization: IModalCustomization = {
        buttonOptions: {
          [ACTION_ID_CONFIRM]: {
            variant: ButtonVariant.danger,
            buttonText: 'Delete',
          },
        },
        additionalText: 'Are you sure?',
      };

      const parentNode = createVisualizationNode('parent', {});
      const childNode = createVisualizationNode('child', {});
      parentNode.addChild(childNode);

      const addon: IOnDeleteAddon = {
        type: IInteractionType.ON_DELETE,
        activationFn: () => true,
        callback: jest.fn(),
        modalCustomization: sharedCustomization,
      };

      const result = findOnDeleteModalCustomizationRecursively(parentNode, () => [addon]);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(sharedCustomization);
    });
  });

  describe('processOnCopyAddon', () => {
    it('should invoke addon callback with correct parameters', () => {
      const mockContent = {
        type: SourceSchemaType.Route,
        name: 'log',
        definition: { log: { message: 'test' } },
      };
      const mockCallback = jest.fn().mockReturnValue(mockContent);
      const vizNode = createVisualizationNode('test', {});

      const mockAddon: IOnCopyAddon = {
        type: IInteractionType.ON_COPY,
        activationFn: () => true,
        callback: mockCallback,
      };

      const result = processOnCopyAddon(vizNode, mockContent, () => [mockAddon]);

      expect(mockCallback).toHaveBeenCalledWith({
        sourceVizNode: vizNode,
        content: mockContent,
      });
      expect(result).toBe(mockContent);
    });
  });

  describe('processOnDuplicateAddonRecursively', () => {
    it('should process addon transformation', async () => {
      const mockContent = {
        type: SourceSchemaType.Route,
        name: 'log',
        definition: { log: { message: 'test' } },
      };
      const transformedContent = {
        type: SourceSchemaType.Route,
        name: 'log',
        definition: { log: { message: 'transformed' } },
      };

      const mockCallback = jest.fn().mockResolvedValue(transformedContent);
      const vizNode = createVisualizationNode('test', { path: 'route.from.steps.0.log' });

      const mockAddon: IOnDuplicateAddon = {
        type: IInteractionType.ON_DUPLICATE,
        activationFn: () => true,
        callback: mockCallback,
      };

      const result = await processOnDuplicateAddonRecursively(vizNode, mockContent, () => [mockAddon]);

      expect(mockCallback).toHaveBeenCalledWith({
        sourceVizNode: vizNode,
        content: mockContent,
      });
      expect(result).toBe(transformedContent);
    });

    it('should return content when no addons return transformation', async () => {
      const mockContent = {
        type: SourceSchemaType.Route,
        name: 'log',
        definition: { log: { message: 'test' } },
      };

      const mockCallback = jest.fn().mockResolvedValue(undefined);
      const vizNode = createVisualizationNode('test', { path: 'route.from.steps.0.log' });

      const mockAddon: IOnDuplicateAddon = {
        type: IInteractionType.ON_DUPLICATE,
        activationFn: () => true,
        callback: mockCallback,
      };

      const result = await processOnDuplicateAddonRecursively(vizNode, mockContent, () => [mockAddon]);

      expect(result).toBe(mockContent);
    });

    it('should return undefined when content is undefined', async () => {
      const vizNode = createVisualizationNode('test', { path: 'route.from.steps.0.log' });

      const result = await processOnDuplicateAddonRecursively(vizNode, undefined, () => []);

      expect(result).toBeUndefined();
    });

    it('should process children when path and children are available', async () => {
      const childContent = {
        type: SourceSchemaType.Route,
        name: 'log',
        definition: { log: { message: 'child' } },
      };

      const parentContent = {
        type: SourceSchemaType.Route,
        name: 'step',
        definition: {
          step: {
            id: 'parent-step',
            steps: [{ log: { message: 'original-child' } }],
          },
        },
      };

      const parentNode = createVisualizationNode('parent', { path: 'route.from.steps.0.step' });
      const childNode = createVisualizationNode('child', { path: 'route.from.steps.0.step.steps.0.log' });
      parentNode.addChild(childNode);

      jest.spyOn(childNode, 'getCopiedContent').mockReturnValue(childContent);

      const mockAddon: IOnDuplicateAddon = {
        type: IInteractionType.ON_DUPLICATE,
        activationFn: () => true,
        callback: jest.fn().mockImplementation(({ content }) => Promise.resolve(content)),
      };

      const result = await processOnDuplicateAddonRecursively(parentNode, parentContent, () => [mockAddon]);

      expect(result).toBeDefined();
    });
  });

  describe('processOnPasteAddon', () => {
    it('should invoke addon callback with correct parameters', async () => {
      const originalContent = {
        type: SourceSchemaType.Route,
        name: 'log',
        definition: { log: { message: 'original' } },
      };
      const updatedContent = {
        type: SourceSchemaType.Route,
        name: 'log',
        definition: { log: { message: 'updated' } },
      };

      const mockCallback = jest.fn().mockResolvedValue(undefined);
      const vizNode = createVisualizationNode('test', {});

      const mockAddon: IOnPasteAddon = {
        type: IInteractionType.ON_PASTE,
        activationFn: () => true,
        callback: mockCallback,
      };

      await processOnPasteAddon(vizNode, originalContent, updatedContent, () => [mockAddon]);

      expect(mockCallback).toHaveBeenCalledWith({
        targetVizNode: vizNode,
        originalContent,
        updatedContent,
      });
    });

    it('should call all registered addons regardless of target vizNode', async () => {
      const originalContent = {
        type: SourceSchemaType.Route,
        name: 'choice',
        definition: {
          choice: {
            when: [
              {
                id: 'datamapper-original-1',
                steps: [{ to: { uri: 'xslt-saxon:original.xsl' } }],
              },
            ],
          },
        },
      };

      const updatedContent = {
        type: SourceSchemaType.Route,
        name: 'choice',
        definition: {
          choice: {
            when: [
              {
                id: 'datamapper-new-1',
                steps: [{ to: { uri: 'xslt-saxon:new.xsl' } }],
              },
            ],
          },
        },
      };

      const targetVizNode = createVisualizationNode('route', {});

      const mockCallback = jest.fn().mockResolvedValue(undefined);

      const mockAddon: IOnPasteAddon = {
        type: IInteractionType.ON_PASTE,
        activationFn: (vizNode) => vizNode.id === 'specific-node',
        callback: mockCallback,
      };

      await processOnPasteAddon(targetVizNode, originalContent, updatedContent, () => [mockAddon]);

      expect(mockCallback).toHaveBeenCalledWith({
        targetVizNode,
        originalContent,
        updatedContent,
      });
    });

    it('should process multiple addons with nested DataMapper content', async () => {
      const originalContent = {
        type: SourceSchemaType.Route,
        name: 'choice',
        definition: {
          choice: {
            when: [
              {
                id: 'datamapper-original-1',
                steps: [{ to: { uri: 'xslt-saxon:original1.xsl' } }],
              },
              {
                id: 'datamapper-original-2',
                steps: [{ to: { uri: 'xslt-saxon:original2.xsl' } }],
              },
            ],
          },
        },
      };

      const updatedContent = {
        type: SourceSchemaType.Route,
        name: 'choice',
        definition: {
          choice: {
            when: [
              {
                id: 'datamapper-new-1',
                steps: [{ to: { uri: 'xslt-saxon:new1.xsl' } }],
              },
              {
                id: 'datamapper-new-2',
                steps: [{ to: { uri: 'xslt-saxon:new2.xsl' } }],
              },
            ],
          },
        },
      };

      const targetVizNode = createVisualizationNode('route', {});

      const mockCallback1 = jest.fn().mockResolvedValue(undefined);
      const mockCallback2 = jest.fn().mockResolvedValue(undefined);

      const mockAddon1: IOnPasteAddon = {
        type: IInteractionType.ON_PASTE,
        activationFn: () => true,
        callback: mockCallback1,
      };

      const mockAddon2: IOnPasteAddon = {
        type: IInteractionType.ON_PASTE,
        activationFn: () => true,
        callback: mockCallback2,
      };

      await processOnPasteAddon(targetVizNode, originalContent, updatedContent, () => [mockAddon1, mockAddon2]);

      expect(mockCallback1).toHaveBeenCalledTimes(1);
      expect(mockCallback2).toHaveBeenCalledTimes(1);
      expect(mockCallback1).toHaveBeenCalledWith({
        targetVizNode,
        originalContent,
        updatedContent,
      });
      expect(mockCallback2).toHaveBeenCalledWith({
        targetVizNode,
        originalContent,
        updatedContent,
      });
    });
  });
});
