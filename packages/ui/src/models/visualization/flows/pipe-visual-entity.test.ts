import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, Pipe } from '@kaoto/camel-catalog/types';
import { cloneDeep } from 'lodash';

import { pipeJson } from '../../../stubs/pipe';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { EntityType } from '../../camel/entities';
import { SourceSchemaType } from '../../camel/source-schema-type';
import { DefinedComponent } from '../../camel-catalog-index';
import { CatalogKind } from '../../catalog-kind';
import { IKameletDefinition } from '../../kamelets-catalog';
import { AddStepMode } from '../base-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { PipeVisualEntity } from './pipe-visual-entity';
import { KameletSchemaService } from './support/kamelet-schema.service';

describe('Pipe', () => {
  let pipeCR: Pipe;
  let pipeVisualEntity: PipeVisualEntity;
  let kameletCatalogMap: Record<string, IKameletDefinition>;

  beforeEach(async () => {
    pipeCR = cloneDeep(pipeJson);
    pipeVisualEntity = new PipeVisualEntity(pipeCR);
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    kameletCatalogMap = catalogsMap.kameletsCatalogMap;
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, kameletCatalogMap);
  });

  describe('constructor', () => {
    it('should initialize with empty pipe object', () => {
      const emptyPipe = new PipeVisualEntity({} as Pipe);
      expect(emptyPipe.id).toBeDefined();
      expect(emptyPipe.pipe.metadata).toBeDefined();
      expect(emptyPipe.pipe.metadata!.name).toBe(emptyPipe.id);
      expect(emptyPipe.pipe.spec).toEqual({
        source: {},
        steps: [],
        sink: {},
      });
    });

    it('should initialize with pipe that has metadata but no name', () => {
      const pipeWithMetadata: Pipe = {
        metadata: {},
      };
      const entity = new PipeVisualEntity(pipeWithMetadata);
      expect(entity.id).toBeDefined();
      expect(entity.pipe.metadata!.name).toBe(entity.id);
    });

    it('should use existing metadata name as id', () => {
      const pipeWithName: Pipe = {
        metadata: {
          name: 'my-custom-pipe',
        },
      };
      const entity = new PipeVisualEntity(pipeWithName);
      expect(entity.id).toBe('my-custom-pipe');
      expect(entity.pipe.metadata!.name).toBe('my-custom-pipe');
    });
  });

  describe('id', () => {
    it('should have an uuid', () => {
      expect(pipeVisualEntity.id).toBeDefined();
      expect(typeof pipeVisualEntity.id).toBe('string');
    });

    it('should have a type', () => {
      expect(pipeVisualEntity.type).toEqual(EntityType.Pipe);
    });

    it('should return the id', () => {
      expect(pipeVisualEntity.getId()).toEqual(expect.any(String));
    });

    it('should change the id', () => {
      pipeVisualEntity.setId('pipe-12345');
      expect(pipeVisualEntity.getId()).toEqual('pipe-12345');
    });

    it('should update pipe metadata name when setting id', () => {
      pipeVisualEntity.setId('pipe-12345');
      expect(pipeVisualEntity.pipe.metadata!.name).toEqual('pipe-12345');
    });
  });

  describe('getRootPath', () => {
    it('should return the root path', () => {
      expect(pipeVisualEntity.getRootPath()).toBe('pipe');
      expect(pipeVisualEntity.getRootPath()).toBe(PipeVisualEntity.ROOT_PATH);
    });
  });

  describe('getNodeLabel', () => {
    it('should return empty string if no path is provided', () => {
      expect(pipeVisualEntity.getNodeLabel()).toBe('');
    });

    it('should return the id when path is root path', () => {
      expect(pipeVisualEntity.getNodeLabel('pipe')).toBe(pipeVisualEntity.id);
    });

    it('should delegate to KameletSchemaService for step paths', () => {
      const spy = jest.spyOn(KameletSchemaService, 'getNodeLabel');
      pipeVisualEntity.getNodeLabel('source');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getNodeTitle', () => {
    it('should return empty string if no path is provided', () => {
      expect(pipeVisualEntity.getNodeTitle()).toBe('');
    });

    it('should return "Pipe" when path is root path', () => {
      expect(pipeVisualEntity.getNodeTitle('pipe')).toBe('Pipe');
    });

    it('should delegate to KameletSchemaService for step paths', () => {
      const spy = jest.spyOn(KameletSchemaService, 'getNodeTitle');
      pipeVisualEntity.getNodeTitle('source');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getTooltipContent', () => {
    it('should return empty string if no path is provided', () => {
      expect(pipeVisualEntity.getTooltipContent()).toBe('');
    });

    it('should delegate to KameletSchemaService for step paths', () => {
      const spy = jest.spyOn(KameletSchemaService, 'getTooltipContent');
      pipeVisualEntity.getTooltipContent('source');
      expect(spy).toHaveBeenCalledWith(expect.anything(), 'source');
    });
  });

  describe('getNodeSchema', () => {
    it('should return undefined if no path is provided', () => {
      expect(pipeVisualEntity.getNodeSchema()).toBeUndefined();
    });

    it('should return {} when using an invalid path', () => {
      const result = pipeVisualEntity.getNodeSchema('test');

      expect(result).toEqual({});
    });

    it('should return the root pipe schema when path is root path', () => {
      const result = pipeVisualEntity.getNodeSchema('pipe');
      expect(result).toBeDefined();
    });

    it('should return the node schema', () => {
      const spy = jest.spyOn(KameletSchemaService, 'getKameletCatalogEntry');

      pipeVisualEntity.getNodeSchema('source');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNodeDefinition', () => {
    it('should return undefined if no path is provided', () => {
      expect(pipeVisualEntity.getNodeDefinition()).toBeUndefined();
    });

    it('should return custom schema from pipe when path is root path', () => {
      const result = pipeVisualEntity.getNodeDefinition('pipe');
      expect(result).toBeDefined();
    });

    it('should return empty object when step has no properties', () => {
      pipeVisualEntity.pipe.spec!.steps!.push({
        ref: {
          apiVersion: 'camel.apache.org/v1',
          kind: 'Kamelet',
          name: 'log-action',
        },
      });
      const result = pipeVisualEntity.getNodeDefinition('steps.1');

      expect(result).toEqual({});
    });

    it('should return the node definition', () => {
      pipeVisualEntity.pipe.spec!.steps!.push({
        ref: {
          apiVersion: 'camel.apache.org/v1',
          kind: 'Kamelet',
          name: 'log-action',
        },
        properties: {
          level: 'DEBUG',
          loggerName: 'kamelet-logger',
          showHeaders: true,
        },
      });
      const result = pipeVisualEntity.getNodeDefinition('steps.1');

      expect(result).toEqual({
        level: 'DEBUG',
        loggerName: 'kamelet-logger',
        showHeaders: true,
      });
    });
  });

  describe('getOmitFormFields', () => {
    it('should return an empty array', () => {
      expect(pipeVisualEntity.getOmitFormFields()).toEqual([]);
    });
  });

  it('should return the json', () => {
    expect(pipeVisualEntity.toJSON()).toEqual(pipeJson.spec);
  });

  describe('updateModel', () => {
    it('should not update the model if no path is provided', () => {
      const originalObject = JSON.parse(JSON.stringify(pipeJson));

      pipeVisualEntity.updateModel(undefined, undefined as unknown as Record<string, unknown>);

      expect(originalObject).toEqual(pipeJson);
    });

    it('should update the model', () => {
      const name = 'webhook-source';

      pipeVisualEntity.updateModel('source', { name });

      expect(pipeVisualEntity.pipe.spec?.source?.properties?.name).toEqual(name);
    });

    it('should not update the model if the path is not correct', () => {
      const name = 'webhook-source';

      pipeVisualEntity.updateModel('nonExistingPath', { name });

      expect(pipeVisualEntity.pipe.spec?.source?.properties).toBeUndefined();
    });
  });

  describe('addStep', () => {
    const mockDefinedComponent: DefinedComponent = {
      name: 'log-action',
      type: CatalogKind.Kamelet,
      definition: {
        kind: 'Kamelet',
        apiVersion: 'camel.apache.org/v1',
      } as unknown as IKameletDefinition,
    };

    it('should add a new step in ReplaceStep mode', () => {
      pipeVisualEntity.addStep({
        definedComponent: mockDefinedComponent,
        mode: AddStepMode.ReplaceStep,
        data: {
          path: 'source',
          catalogKind: CatalogKind.Kamelet,
          name: 'log-action',
        },
      });

      expect(pipeVisualEntity.pipe.spec!.source).toMatchObject({
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'log-action',
        },
      });
    });

    it('should append a new step after existing step', () => {
      const initialStepsLength = pipeVisualEntity.pipe.spec!.steps!.length;
      pipeVisualEntity.addStep({
        definedComponent: mockDefinedComponent,
        mode: AddStepMode.AppendStep,
        data: {
          path: 'steps.0',
          catalogKind: CatalogKind.Kamelet,
          name: 'log-action',
        },
      });

      expect(pipeVisualEntity.pipe.spec!.steps).toHaveLength(initialStepsLength + 1);
      expect(pipeVisualEntity.pipe.spec!.steps![1]).toMatchObject({
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'log-action',
        },
      });
    });

    it('should prepend a new step before existing step', () => {
      const initialStepsLength = pipeVisualEntity.pipe.spec!.steps!.length;
      pipeVisualEntity.addStep({
        definedComponent: mockDefinedComponent,
        mode: AddStepMode.PrependStep,
        data: {
          path: 'steps.0',
          catalogKind: CatalogKind.Kamelet,
          name: 'log-action',
        },
      });

      expect(pipeVisualEntity.pipe.spec!.steps).toHaveLength(initialStepsLength + 1);
      expect(pipeVisualEntity.pipe.spec!.steps![0]).toMatchObject({
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'log-action',
        },
      });
    });

    it('should prepend a new step before sink by pushing to steps array', () => {
      const initialStepsLength = pipeVisualEntity.pipe.spec!.steps!.length;
      pipeVisualEntity.addStep({
        definedComponent: mockDefinedComponent,
        mode: AddStepMode.PrependStep,
        data: {
          path: 'sink',
          catalogKind: CatalogKind.Kamelet,
          name: 'log-action',
        },
      });

      expect(pipeVisualEntity.pipe.spec!.steps).toHaveLength(initialStepsLength + 1);
      expect(pipeVisualEntity.pipe.spec!.steps![initialStepsLength]).toMatchObject({
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'log-action',
        },
      });
    });

    it('should not add step if newKamelet is undefined', () => {
      const definedComponentWithoutDefinition: DefinedComponent = {
        name: 'log-action',
        type: CatalogKind.Kamelet,
        definition: undefined,
      };

      const initialStepsLength = pipeVisualEntity.pipe.spec!.steps!.length;
      pipeVisualEntity.addStep({
        definedComponent: definedComponentWithoutDefinition,
        mode: AddStepMode.AppendStep,
        data: {
          path: 'steps.0',
          catalogKind: CatalogKind.Kamelet,
          name: 'log-action',
        },
      });

      expect(pipeVisualEntity.pipe.spec!.steps).toHaveLength(initialStepsLength);
    });
  });

  describe('canDragNode', () => {
    it('should return false if path is undefined', () => {
      expect(pipeVisualEntity.canDragNode()).toBe(false);
    });

    it('should return false for source', () => {
      expect(pipeVisualEntity.canDragNode('source')).toBe(false);
    });

    it('should return false for sink', () => {
      expect(pipeVisualEntity.canDragNode('sink')).toBe(false);
    });

    it('should return true for steps', () => {
      expect(pipeVisualEntity.canDragNode('steps.0')).toBe(true);
    });

    it('should return true for any other path', () => {
      expect(pipeVisualEntity.canDragNode('pipe')).toBe(true);
    });
  });

  describe('canDropOnNode', () => {
    it('should delegate to canDragNode', () => {
      const spy = jest.spyOn(pipeVisualEntity, 'canDragNode');
      pipeVisualEntity.canDropOnNode('steps.0');
      expect(spy).toHaveBeenCalledWith('steps.0');
    });

    it('should return false for source', () => {
      expect(pipeVisualEntity.canDropOnNode('source')).toBe(false);
    });

    it('should return false for sink', () => {
      expect(pipeVisualEntity.canDropOnNode('sink')).toBe(false);
    });

    it('should return true for steps', () => {
      expect(pipeVisualEntity.canDropOnNode('steps.0')).toBe(true);
    });
  });

  describe('removeStep', () => {
    it('should not remove the step if no path is provided', () => {
      pipeVisualEntity.removeStep();

      expect(pipeVisualEntity.toJSON()).toEqual(pipeJson.spec);
    });

    it('should remove the `source` step', () => {
      pipeVisualEntity.removeStep('source');

      expect(pipeVisualEntity.toJSON()).not.toEqual(pipeJson.spec);
      expect(pipeVisualEntity.pipe.spec?.source).toMatchObject({});
    });

    it('should remove the `sink` step', () => {
      pipeVisualEntity.removeStep('sink');

      expect(pipeVisualEntity.toJSON()).not.toEqual(pipeJson.spec);
      expect(pipeVisualEntity.pipe.spec?.sink).toMatchObject({});
    });

    it('should remove the `steps.0` step', () => {
      pipeVisualEntity.removeStep('steps.0');

      expect(pipeVisualEntity.toJSON()).not.toEqual(pipeJson.spec);
      expect(pipeVisualEntity.pipe.spec!.steps).toEqual([]);
    });
  });

  describe('getNodeInteraction', () => {
    it.each(['source', 'sink', 'steps.1', '#'])(
      `should return the correct interaction for the '%s' processor`,
      (path) => {
        const result = pipeVisualEntity.getNodeInteraction({
          path,
          catalogKind: CatalogKind.Kamelet,
          name: 'log-action',
        });
        expect(result).toMatchSnapshot();
      },
    );
  });

  describe('getNodeValidationText', () => {
    it('should return an `undefined` if the path is `undefined`', () => {
      const result = pipeVisualEntity.getNodeValidationText();

      expect(result).toEqual(undefined);
    });

    it('should return an `undefined` if the path is empty', () => {
      const result = pipeVisualEntity.getNodeValidationText('');

      expect(result).toEqual(undefined);
    });

    it('should return a validation text relying on the `validateNodeStatus` method', () => {
      const missingParametersModel = cloneDeep(pipeJson);
      missingParametersModel.spec!.steps![0].properties = {};
      pipeVisualEntity = new PipeVisualEntity(missingParametersModel);

      const result = pipeVisualEntity.getNodeValidationText('steps.0');

      expect(result).toEqual('1 required parameter is not yet configured: [ milliseconds ]');
    });
  });

  describe('toVizNode', () => {
    it('should return the viz node and set the initial path to `#`', () => {
      const vizNode = pipeVisualEntity.toVizNode();

      expect(vizNode).toBeDefined();
      expect(vizNode.data.path).toEqual(PipeVisualEntity.ROOT_PATH);
    });

    it('should use the path as the node id', () => {
      const vizNode = pipeVisualEntity.toVizNode();
      const sourceNode = vizNode.getChildren()![0];
      const stepNode = sourceNode.getNextNode()!;
      const sinkNode = stepNode.getNextNode()!;

      expect(sourceNode.id).toEqual('source');
      expect(stepNode.id).toEqual('steps.0');
      expect(sinkNode.id).toEqual('sink');
    });

    it('should use the uri as the node label', () => {
      const vizNode = pipeVisualEntity.toVizNode();

      expect(vizNode.getNodeLabel()).toEqual('webhook-binding');
    });

    it('should set the title to `Pipe`', () => {
      const vizNode = pipeVisualEntity.toVizNode();

      expect(vizNode.getNodeTitle()).toEqual('Pipe');
    });

    it('should get the titles from children nodes', () => {
      const vizNode = pipeVisualEntity.toVizNode();

      const sourceNode = vizNode.getChildren()![0];
      const stepNode = vizNode.getChildren()![1];
      const sinkNode = vizNode.getChildren()![2];

      expect(sourceNode.getNodeTitle()).toEqual('Webhook Source');
      expect(stepNode.getNodeTitle()).toEqual('Delay Action');
      expect(sinkNode.getNodeTitle()).toEqual('Log Sink');
    });

    it('should set the node labels when the uri is not available', () => {
      pipeVisualEntity = new PipeVisualEntity({});

      const sourceNode = pipeVisualEntity.toVizNode().getChildren()![0];
      const sinkNode = sourceNode.getNextNode();

      expect(sourceNode.getNodeLabel()).toEqual('source');
      expect(sinkNode!.getNodeLabel()).toEqual('sink');
    });

    it('should populate the viz node chain with the steps', () => {
      const vizNode = pipeVisualEntity.toVizNode();

      expect(vizNode.data.path).toEqual(PipeVisualEntity.ROOT_PATH);
      expect(vizNode.getNodeLabel()).toEqual('webhook-binding');
      expect(vizNode.getPreviousNode()).toBeUndefined();
      expect(vizNode.getNextNode()).toBeUndefined();
      expect(vizNode.getChildren()).toBeDefined();

      const source = vizNode.getChildren()![0];
      expect(source.getNodeLabel()).toEqual('webhook-source');
      expect(source.getPreviousNode()).toBeUndefined();
      expect(source.getNextNode()).toBeDefined();

      const steps0 = source.getNextNode()!;
      expect(steps0.data.path).toEqual('steps.0');
      expect(steps0.getNodeLabel()).toEqual('delay-action');
      expect(steps0.getPreviousNode()).toBe(source);
      expect(steps0.getNextNode()).toBeDefined();

      const sink = steps0.getNextNode()!;
      expect(sink.data.path).toEqual('sink');
      expect(sink.getNodeLabel()).toEqual('log-sink');
      expect(sink.getPreviousNode()).toBe(steps0);
      expect(sink.getNextNode()).toBeUndefined();
    });

    it('should include all steps as children of the Pipe group', () => {
      const vizNode = pipeVisualEntity.toVizNode();

      const sourceNode = vizNode.getChildren()![0];
      const stepNode = vizNode.getChildren()![1];
      const sinkNode = vizNode.getChildren()![2];

      expect(vizNode.getChildren()).toHaveLength(3);

      expect(sourceNode.getPreviousNode()).toBeUndefined();
      expect(sourceNode.getNextNode()).toBe(stepNode);

      expect(stepNode.getPreviousNode()).toBe(sourceNode);
      expect(stepNode.getNextNode()).toBe(sinkNode);

      expect(sinkNode.getPreviousNode()).toBe(stepNode);
      expect(sinkNode.getNextNode()).toBeUndefined();
    });

    it('should handle pipe with multiple steps', () => {
      const pipeWithMultipleSteps = cloneDeep(pipeJson);
      pipeWithMultipleSteps.spec!.steps = [
        {
          ref: {
            kind: 'Kamelet',
            apiVersion: 'camel.apache.org/v1',
            name: 'delay-action',
          },
        },
        {
          ref: {
            kind: 'Kamelet',
            apiVersion: 'camel.apache.org/v1',
            name: 'log-action',
          },
        },
        {
          ref: {
            kind: 'Kamelet',
            apiVersion: 'camel.apache.org/v1',
            name: 'avro-serialize-action',
          },
        },
      ];
      const entity = new PipeVisualEntity(pipeWithMultipleSteps);
      const vizNode = entity.toVizNode();

      // Should have source + 3 steps + sink = 5 children
      expect(vizNode.getChildren()).toHaveLength(5);

      const sourceNode = vizNode.getChildren()![0];
      const step1Node = vizNode.getChildren()![1];
      const step2Node = vizNode.getChildren()![2];
      const step3Node = vizNode.getChildren()![3];
      const sinkNode = vizNode.getChildren()![4];

      expect(sourceNode.getNextNode()).toBe(step1Node);
      expect(step1Node.getPreviousNode()).toBe(sourceNode);
      expect(step1Node.getNextNode()).toBe(step2Node);
      expect(step2Node.getPreviousNode()).toBe(step1Node);
      expect(step2Node.getNextNode()).toBe(step3Node);
      expect(step3Node.getPreviousNode()).toBe(step2Node);
      expect(step3Node.getNextNode()).toBe(sinkNode);
      expect(sinkNode.getPreviousNode()).toBe(step3Node);
    });

    it('should create placeholder nodes when step ref name is undefined', () => {
      const pipeWithPlaceholder = cloneDeep(pipeJson);
      pipeWithPlaceholder.spec!.steps = [
        {
          ref: {
            kind: 'Kamelet',
            apiVersion: 'camel.apache.org/v1',
          },
        },
      ];
      const entity = new PipeVisualEntity(pipeWithPlaceholder);
      const vizNode = entity.toVizNode();

      const stepNode = vizNode.getChildren()![1];
      expect(stepNode.data.isPlaceholder).toBe(true);
    });
  });

  describe('pasteStep', () => {
    it('should append a new step to the model', () => {
      pipeVisualEntity.pasteStep({
        clipboardContent: {
          name: 'avro-serialize-action',
          type: SourceSchemaType.Pipe,
          definition: {
            ref: {
              kind: 'Kamelet',
              apiVersion: 'camel.apache.org/v1',
              name: 'avro-serialize-action',
            },
          },
        },
        mode: AddStepMode.AppendStep,
        data: {
          path: 'steps.0',
          catalogKind: CatalogKind.Kamelet,
          name: 'log-action',
        },
      });

      expect(pipeVisualEntity.pipe.spec!.steps).toHaveLength(2);
      expect(pipeVisualEntity.pipe.spec!.steps).toMatchSnapshot();
    });
  });

  describe('getCopiedContent', () => {
    it('should return the copied content for a step', () => {
      const copiedContent = pipeVisualEntity.getCopiedContent('steps.0');
      expect(copiedContent).toEqual({
        type: SourceSchemaType.Pipe,
        name: 'delay-action',
        definition: {
          ref: {
            kind: 'Kamelet',
            apiVersion: 'camel.apache.org/v1',
            name: 'delay-action',
          },
        },
      });
    });

    it('should return undefined if the path is undefined', () => {
      const copiedContent = pipeVisualEntity.getCopiedContent();
      expect(copiedContent).toBeUndefined();
    });

    it('should return undefined node default value if the path is invalid', () => {
      const copiedContent = pipeVisualEntity.getCopiedContent('steps.1');
      expect(copiedContent).toEqual({
        type: SourceSchemaType.Pipe,
        name: '',
        defaultValue: undefined,
      });
    });
  });
});
