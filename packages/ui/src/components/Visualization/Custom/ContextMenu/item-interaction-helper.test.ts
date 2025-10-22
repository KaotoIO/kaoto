import { processOnDeleteAddonRecursively } from './item-interaction-helper';
import { createVisualizationNode } from '../../../../models';
import {
  IInteractionType,
  IRegisteredInteractionAddon,
} from '../../../registers/interactions/node-interaction-addon.model';
import { ACTION_ID_CONFIRM } from '../../../../providers';

describe('item-interaction-helper', () => {
  describe('processOnDeleteAddonRecursively', () => {
    it('should process children', () => {
      const addons: Record<string, IRegisteredInteractionAddon<IInteractionType.ON_DELETE>[]> = {};
      const vizNode = createVisualizationNode('test', {});
      const childVn = createVisualizationNode('child', {});
      const mockAddon: IRegisteredInteractionAddon<IInteractionType.ON_DELETE> = {
        type: IInteractionType.ON_DELETE,
        activationFn: () => true,
        callback: jest.fn(),
      };
      addons[childVn.id] = [mockAddon];
      vizNode.addChild(childVn);
      processOnDeleteAddonRecursively(vizNode, ACTION_ID_CONFIRM, (vn) => addons[vn.id] ?? []);
      expect(mockAddon.callback).toHaveBeenCalled();
    });
  });
});
