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

import { CatalogKind } from '../../../../models';
import { IVisualizationNode, IVisualizationNodeData } from '../../../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { LayoutType } from '../../Canvas/canvas.models';
import { getMoveIcons } from './get-move-icons.util';

describe('getMoveIcons', () => {
  const createMockVizNode = (processorName: string): IVisualizationNode => {
    return createVisualizationNode(`test-${processorName}`, {
      name: processorName,
      path: `route.from.steps.0.${processorName}`,
      primaryNodeId: { name: processorName, catalogKind: CatalogKind.Pattern },
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
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
    it.each(['when', 'doCatch', 'get', 'onFallback'])(
      'should return horizontal icons for "%s" node in vertical layout (inverted)',
      (processorName) => {
        const vizNode = createMockVizNode(processorName);

        const icons = getMoveIcons(LayoutType.DagreVertical, vizNode);

        expect(icons.prepend.type).toBe(ArrowLeftIcon);
        expect(icons.append.type).toBe(ArrowRightIcon);
        expect(icons.moveBefore.type).toBe(AngleDoubleLeftIcon);
        expect(icons.moveNext.type).toBe(AngleDoubleRightIcon);
      },
    );

    it('should return vertical icons for "when" node in horizontal layout (inverted)', () => {
      const vizNode = createMockVizNode('when');

      const icons = getMoveIcons(LayoutType.DagreHorizontal, vizNode);

      expect(icons.prepend.type).toBe(ArrowUpIcon);
      expect(icons.append.type).toBe(ArrowDownIcon);
      expect(icons.moveBefore.type).toBe(AngleDoubleUpIcon);
      expect(icons.moveNext.type).toBe(AngleDoubleDownIcon);
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
