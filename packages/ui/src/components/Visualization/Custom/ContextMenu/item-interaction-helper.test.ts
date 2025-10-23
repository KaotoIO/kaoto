import { processOnDeleteAddonRecursively } from './item-interaction-helper';
import { createVisualizationNode } from '../../../../models';
import {
  IInteractionType,
  IOnDeleteAddon,
  IRegisteredInteractionAddon,
} from '../../../registers/interactions/node-interaction-addon.model';
import { ACTION_ID_CONFIRM } from '../../../../providers';

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
});
