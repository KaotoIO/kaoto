import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { Visualization } from '@patternfly/react-topology';

import { IVisualizationNode } from '../../models';
import { Test } from '../../models/citrus/entities/Test';
import { CitrusTestVisualEntity } from '../../models/visualization/flows/citrus-test-visual-entity';
import { CitrusTestSchemaService } from '../../models/visualization/flows/support/citrus-test-schema.service';
import { getFirstCitrusCatalogMap, setupCitrusDynamicCatalogRegistry } from '../../stubs/test-load-catalog';
import { consumeNodeSelection, requestNodeSelection } from '../Visualization/Canvas/node-selection-state';
import { buildDesignerCanvasModel } from '../Visualization/designer-canvas-model';
import { onUpdateCitrusWaitFor } from './on-update-citrus-wait-for';

describe('onUpdateCitrusWaitFor', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary as CatalogLibrary);
    setupCitrusDynamicCatalogRegistry(catalogsMap);
  });

  afterEach(() => {
    CitrusTestSchemaService.clearKindMap();
  });

  const createVizNode = (definition: unknown, isGroup: boolean) =>
    ({ data: { definition, isGroup } }) as unknown as IVisualizationNode;

  it('should rebuild when the action condition is added to a leaf node', () => {
    const rebuild = vi.fn();

    onUpdateCitrusWaitFor(createVizNode({ action: {} }, false), rebuild);

    expect(rebuild).toHaveBeenCalledTimes(1);
  });

  it('should rebuild when the action condition is removed from a group node', () => {
    const rebuild = vi.fn();

    onUpdateCitrusWaitFor(createVizNode({ http: { url: 'http://localhost' } }, true), rebuild);

    expect(rebuild).toHaveBeenCalledTimes(1);
  });

  it('should not rebuild when the group node keeps the action condition', () => {
    const rebuild = vi.fn();

    onUpdateCitrusWaitFor(createVizNode({ action: {}, timeout: '10000' }, true), rebuild);

    expect(rebuild).not.toHaveBeenCalled();
  });

  it('should not rebuild when the leaf node has no action condition', () => {
    const rebuild = vi.fn();

    onUpdateCitrusWaitFor(createVizNode({ http: { url: 'http://localhost:8080' } }, false), rebuild);

    expect(rebuild).not.toHaveBeenCalled();
  });

  it('should treat an undefined definition as a leaf node', () => {
    const rebuild = vi.fn();

    onUpdateCitrusWaitFor(createVizNode(undefined, false), rebuild);

    expect(rebuild).not.toHaveBeenCalled();
  });

  describe('with a CitrusTestVisualEntity', () => {
    const getWaitForNode = async (waitFor: Record<string, unknown>) => {
      const entity = new CitrusTestVisualEntity({ name: 'test', actions: [{ waitFor }] } as unknown as Test);
      const waitForNode = (await entity.toVizNode()).getChildren()![0];
      await waitForNode.fetchNodeDefinition();
      return waitForNode;
    };

    /** Mimics the form, which edits the node definition in place before calling `updateModel` */
    const editFromForm = (waitForNode: IVisualizationNode, edit: (definition: Record<string, unknown>) => void) => {
      const definition = waitForNode.data.definition as Record<string, unknown>;
      edit(definition);
      waitForNode.updateModel(definition);
    };

    it('should rebuild once the form update adds the action condition', async () => {
      const rebuild = vi.fn();
      const waitForNode = await getWaitForNode({ http: { url: 'http://localhost' } });
      expect(waitForNode.data.isGroup).toBe(false);

      editFromForm(waitForNode, (definition) => {
        delete definition.http;
        definition.action = {};
      });
      onUpdateCitrusWaitFor(waitForNode, rebuild);

      expect(rebuild).toHaveBeenCalledTimes(1);
    });

    it('should rebuild once the form update removes the action condition', async () => {
      const rebuild = vi.fn();
      const waitForNode = await getWaitForNode({ action: {} });
      expect(waitForNode.data.isGroup).toBe(true);

      editFromForm(waitForNode, (definition) => {
        delete definition.action;
        definition.http = { url: 'http://localhost' };
      });
      onUpdateCitrusWaitFor(waitForNode, rebuild);

      expect(rebuild).toHaveBeenCalledTimes(1);
    });

    it('should not rebuild when updating a non-structural property', async () => {
      const rebuild = vi.fn();
      const waitForNode = await getWaitForNode({ action: {} });

      editFromForm(waitForNode, (definition) => {
        definition.timeout = '10000';
      });
      onUpdateCitrusWaitFor(waitForNode, rebuild);

      expect(rebuild).not.toHaveBeenCalled();
    });

    it('should reselect the waitFor node once it is rebuilt from a leaf into a group', async () => {
      const entity = new CitrusTestVisualEntity({
        name: 'test',
        actions: [{ waitFor: { http: { url: 'http://localhost' } } }],
      } as unknown as Test);
      const controller = new Visualization();
      const waitForNode = (await entity.toVizNode()).getChildren()![0];
      await waitForNode.fetchNodeDefinition();

      editFromForm(waitForNode, (definition) => {
        delete definition.http;
        definition.action = {};
      });
      requestNodeSelection(controller, waitForNode, waitForNode.data.path);

      const { nodes } = buildDesignerCanvasModel([await entity.toVizNode()]);
      const selection = consumeNodeSelection(controller, nodes);

      expect(selection).toHaveLength(1);
      const selectedNode = nodes.find((node) => node.id === selection![0])!;
      expect(selectedNode.data!.vizNode!.data.path).toBe('actions.0.waitFor');
      expect(selectedNode.data!.vizNode!.data.isGroup).toBe(true);
    });
  });
});
