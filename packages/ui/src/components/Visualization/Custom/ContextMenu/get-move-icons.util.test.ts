import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import {
  AngleDoubleDownIcon,
  AngleDoubleLeftIcon,
  AngleDoubleRightIcon,
  AngleDoubleUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
} from '@patternfly/react-icons';

import { IVisualizationNode, IVisualizationNodeData } from '../../../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntityData } from '../../../../models/visualization/flows/support/camel-component-types';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { LayoutType } from '../../Canvas/canvas.models';
import { getMoveIcons } from './get-move-icons.util';

describe('getMoveIcons', () => {
  const createMockVizNode = (processorName: string): IVisualizationNode => {
    const data: CamelRouteVisualEntityData = {
      name: processorName,
      path: `route.from.steps.0.${processorName}`,
      processorName: processorName as keyof ProcessorDefinition,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    };
    return createVisualizationNode(`test-${processorName}`, data);
  };

  describe('Regular steps (non-special children)', () => {
    it('should return vertical icons for regular steps in vertical layout', () => {
      const vizNode = createMockVizNode('log');

      const icons = getMoveIcons(LayoutType.DagreVertical, vizNode);

      expect(icons.prepend.type).toBe(ArrowUpIcon);
      expect(icons.append.type).toBe(ArrowDownIcon);
      expect(icons.moveBefore.type).toBe(AngleDoubleUpIcon);
      expect(icons.moveNext.type).toBe(AngleDoubleDownIcon);
    });

    it('should return horizontal icons for regular steps in horizontal layout', () => {
      const vizNode = createMockVizNode('log');

      const icons = getMoveIcons(LayoutType.DagreHorizontal, vizNode);

      expect(icons.prepend.type).toBe(ArrowLeftIcon);
      expect(icons.append.type).toBe(ArrowRightIcon);
      expect(icons.moveBefore.type).toBe(AngleDoubleLeftIcon);
      expect(icons.moveNext.type).toBe(AngleDoubleRightIcon);
    });

    it('should return horizontal icons for regular steps when layout is undefined', () => {
      const vizNode = createMockVizNode('to');

      const icons = getMoveIcons(undefined, vizNode);

      expect(icons.prepend.type).toBe(ArrowLeftIcon);
      expect(icons.append.type).toBe(ArrowRightIcon);
      expect(icons.moveBefore.type).toBe(AngleDoubleLeftIcon);
      expect(icons.moveNext.type).toBe(AngleDoubleRightIcon);
    });
  });

  describe('Special child nodes (array-clause processors) - inverted direction', () => {
    it('should return horizontal icons for "when" node in vertical layout (inverted)', () => {
      const vizNode = createMockVizNode('when');

      const icons = getMoveIcons(LayoutType.DagreVertical, vizNode);

      expect(icons.prepend.type).toBe(ArrowLeftIcon);
      expect(icons.append.type).toBe(ArrowRightIcon);
      expect(icons.moveBefore.type).toBe(AngleDoubleLeftIcon);
      expect(icons.moveNext.type).toBe(AngleDoubleRightIcon);
    });

    it('should return vertical icons for "when" node in horizontal layout (inverted)', () => {
      const vizNode = createMockVizNode('when');

      const icons = getMoveIcons(LayoutType.DagreHorizontal, vizNode);

      expect(icons.prepend.type).toBe(ArrowUpIcon);
      expect(icons.append.type).toBe(ArrowDownIcon);
      expect(icons.moveBefore.type).toBe(AngleDoubleUpIcon);
      expect(icons.moveNext.type).toBe(AngleDoubleDownIcon);
    });

    it('should return horizontal icons for "doCatch" node in vertical layout (inverted)', () => {
      const vizNode = createMockVizNode('doCatch');

      const icons = getMoveIcons(LayoutType.DagreVertical, vizNode);

      expect(icons.prepend.type).toBe(ArrowLeftIcon);
      expect(icons.append.type).toBe(ArrowRightIcon);
      expect(icons.moveBefore.type).toBe(AngleDoubleLeftIcon);
      expect(icons.moveNext.type).toBe(AngleDoubleRightIcon);
    });

    it('should return horizontal icons for REST DSL verb "get" in vertical layout (inverted)', () => {
      const vizNode = createMockVizNode('get');

      const icons = getMoveIcons(LayoutType.DagreVertical, vizNode);

      expect(icons.prepend.type).toBe(ArrowLeftIcon);
      expect(icons.append.type).toBe(ArrowRightIcon);
      expect(icons.moveBefore.type).toBe(AngleDoubleLeftIcon);
      expect(icons.moveNext.type).toBe(AngleDoubleRightIcon);
    });

    it('should return horizontal icons for "onFallback" node in vertical layout (inverted)', () => {
      const vizNode = createMockVizNode('onFallback');

      const icons = getMoveIcons(LayoutType.DagreVertical, vizNode);

      expect(icons.prepend.type).toBe(ArrowLeftIcon);
      expect(icons.append.type).toBe(ArrowRightIcon);
      expect(icons.moveBefore.type).toBe(AngleDoubleLeftIcon);
      expect(icons.moveNext.type).toBe(AngleDoubleRightIcon);
    });
  });

  describe('Edge cases', () => {
    it('should return horizontal icons when layout is undefined', () => {
      const vizNode = createMockVizNode('log');

      const icons = getMoveIcons(undefined, vizNode);

      // Default to horizontal when no layout info available
      expect(icons.prepend.type).toBe(ArrowLeftIcon);
      expect(icons.append.type).toBe(ArrowRightIcon);
      expect(icons.moveBefore.type).toBe(AngleDoubleLeftIcon);
      expect(icons.moveNext.type).toBe(AngleDoubleRightIcon);
    });

    it('should return vertical icons when vizNode is undefined', () => {
      const icons = getMoveIcons(LayoutType.DagreVertical);

      // Without vizNode, treat as regular step and follow layout
      expect(icons.prepend.type).toBe(ArrowUpIcon);
      expect(icons.append.type).toBe(ArrowDownIcon);
      expect(icons.moveBefore.type).toBe(AngleDoubleUpIcon);
      expect(icons.moveNext.type).toBe(AngleDoubleDownIcon);
    });

    it('should handle vizNode without processorName', () => {
      const data: IVisualizationNodeData = {
        name: 'unknown',
        path: 'route.from.steps.0',
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      };
      const vizNode = createVisualizationNode('test-unknown', data);

      const icons = getMoveIcons(LayoutType.DagreVertical, vizNode);

      // Without processorName, treat as regular step
      expect(icons.prepend.type).toBe(ArrowUpIcon);
      expect(icons.append.type).toBe(ArrowDownIcon);
      expect(icons.moveBefore.type).toBe(AngleDoubleUpIcon);
      expect(icons.moveNext.type).toBe(AngleDoubleDownIcon);
    });
  });

  describe('All special child processors', () => {
    const specialChildProcessors = [
      'when',
      'otherwise',
      'doCatch',
      'doFinally',
      'onFallback',
      'get',
      'post',
      'put',
      'delete',
      'patch',
      'head',
    ];

    specialChildProcessors.forEach((processorName) => {
      it(`should return horizontal icons for "${processorName}" in vertical layout (inverted)`, () => {
        const vizNode = createMockVizNode(processorName);

        const icons = getMoveIcons(LayoutType.DagreVertical, vizNode);

        expect(icons.prepend.type).toBe(ArrowLeftIcon);
        expect(icons.append.type).toBe(ArrowRightIcon);
        expect(icons.moveBefore.type).toBe(AngleDoubleLeftIcon);
        expect(icons.moveNext.type).toBe(AngleDoubleRightIcon);
      });
    });
  });
});
