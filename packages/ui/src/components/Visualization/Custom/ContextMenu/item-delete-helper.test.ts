import { processNodeInteractionAddonRecursively } from './item-delete-helper';
import { createVisualizationNode } from '../../../../models';
import {
  IInteractionAddonType,
  IRegisteredInteractionAddon,
} from '../../../registers/interactions/node-interaction-addon.model';

describe('item-delete-helper', () => {
  describe('processNodeInteractionAddonRecursively', () => {
    it('should process children', () => {
      const addons: Record<string, IRegisteredInteractionAddon[]> = {};
      const vizNode = createVisualizationNode('test', {});
      const childVn = createVisualizationNode('child', {});
      const mockAddon: IRegisteredInteractionAddon = {
        type: IInteractionAddonType.ON_DELETE,
        activationFn: () => true,
        callback: jest.fn(),
      };
      addons[childVn.id] = [mockAddon];
      vizNode.addChild(childVn);
      processNodeInteractionAddonRecursively(vizNode, (vn) => addons[vn.id] ?? []);
      expect(mockAddon.callback).toHaveBeenCalled();
    });
  });
});
