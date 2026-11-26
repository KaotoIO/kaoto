import { Point } from '@patternfly/react-topology';

import { buildFakeCanvas } from '../../../../stubs/route-link-nodes';
import { LayoutType } from '../../Canvas/canvas.models';
import { getAgentStepLinkPoints, getAgentStepPort, roundedPath } from './agent-step-link-path';

describe('agent-step-link-path', () => {
  describe('in a horizontal layout', () => {
    it('should start the link under the name of the step', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        { id: 'route', bounds: [0, 0, 800, 300], children: [{ id: 'agent', bounds: [100, 50, 90, 75] }] },
      ]);

      expect(getAgentStepPort(getNode('agent'), true)).toEqual(new Point(145, 149));
    });

    it('should go down from a step of the route, then along its bottom to where the link leaves it', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        {
          id: 'route',
          bounds: [0, 0, 800, 300],
          children: [
            { id: 'agent', bounds: [100, 50, 90, 75] },
            { id: 'next', bounds: [300, 50, 90, 75] },
          ],
        },
      ]);

      expect(getAgentStepLinkPoints(getNode('agent'), getNode('route'), true)).toEqual([
        new Point(145, 149),
        new Point(145, 290),
        new Point(800, 290),
      ]);
    });

    it('should go past the steps stacked under the step, then out of their container', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        {
          id: 'route',
          bounds: [0, 0, 800, 500],
          children: [
            {
              id: 'multicast',
              bounds: [50, 20, 300, 400],
              children: [
                { id: 'agent', bounds: [100, 50, 90, 75] },
                { id: 'stacked', bounds: [100, 200, 90, 75] },
              ],
            },
          ],
        },
      ]);

      /* The stacked step and its name end at 220, the container at 350 */
      expect(getAgentStepLinkPoints(getNode('agent'), getNode('route'), true)).toEqual([
        new Point(145, 149),
        new Point(228, 149),
        new Point(228, 490),
        new Point(800, 490),
      ]);
    });

    it('should keep halfway between the stacked steps and the side of their container when it is close', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        {
          id: 'route',
          bounds: [0, 0, 800, 500],
          children: [
            {
              id: 'multicast',
              bounds: [50, 20, 180, 400],
              children: [
                { id: 'agent', bounds: [100, 50, 90, 75] },
                { id: 'stacked', bounds: [100, 200, 90, 75] },
              ],
            },
          ],
        },
      ]);

      expect(getAgentStepLinkPoints(getNode('agent'), getNode('route'), true)[1]).toEqual(new Point(225, 149));
    });

    it('should go straight across the steps that are not shown', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        {
          id: 'route',
          bounds: [0, 0, 800, 500],
          children: [
            {
              id: 'multicast',
              bounds: [50, 20, 300, 400],
              children: [
                { id: 'agent', bounds: [100, 50, 90, 75] },
                { id: 'hidden', bounds: [100, 200, 90, 75], hidden: true },
              ],
            },
          ],
        },
      ]);

      expect(getAgentStepLinkPoints(getNode('agent'), getNode('route'), true)).toEqual([
        new Point(145, 149),
        new Point(145, 490),
        new Point(800, 490),
      ]);
    });

    it('should go past a stacked container by its box, without a name under it', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        {
          id: 'route',
          bounds: [0, 0, 800, 500],
          children: [
            {
              id: 'choice',
              bounds: [50, 20, 400, 400],
              children: [
                { id: 'when', bounds: [80, 40, 200, 150], children: [{ id: 'agent', bounds: [100, 60, 90, 75] }] },
                { id: 'otherwise', bounds: [80, 220, 300, 150], children: [] },
              ],
            },
          ],
        },
      ]);

      expect(getAgentStepLinkPoints(getNode('agent'), getNode('route'), true)).toEqual([
        new Point(145, 159),
        new Point(145, 180),
        new Point(388, 180),
        new Point(388, 490),
        new Point(800, 490),
      ]);
    });

    it('should leave past the widest route of the rank', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        { id: 'route', bounds: [0, 0, 400, 300], children: [{ id: 'agent', bounds: [100, 50, 90, 75] }] },
        { id: 'wide', bounds: [0, 400, 600, 100] },
      ]);

      expect(getAgentStepLinkPoints(getNode('agent'), getNode('route'), true).at(-1)).toEqual(new Point(600, 290));
    });
  });

  describe('in a vertical layout', () => {
    it('should start the link on the right of the step', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreVertical, [
        { id: 'route', bounds: [0, 0, 400, 800], children: [{ id: 'agent', bounds: [100, 100, 90, 75] }] },
      ]);

      expect(getAgentStepPort(getNode('agent'), false)).toEqual(new Point(190, 137.5));
    });

    it('should go right from a step of the route, then down its right side to where the link leaves it', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreVertical, [
        { id: 'route', bounds: [0, 0, 400, 800], children: [{ id: 'agent', bounds: [100, 100, 90, 75] }] },
      ]);

      expect(getAgentStepLinkPoints(getNode('agent'), getNode('route'), false)).toEqual([
        new Point(190, 137.5),
        new Point(395, 137.5),
        new Point(395, 800),
      ]);
    });

    it('should go past the name of the step and the steps beside it, under them', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreVertical, [
        {
          id: 'route',
          bounds: [0, 0, 800, 800],
          children: [
            {
              id: 'multicast',
              bounds: [20, 50, 500, 300],
              children: [
                { id: 'agent', bounds: [100, 100, 90, 75] },
                { id: 'beside', bounds: [300, 100, 90, 75] },
              ],
            },
          ],
        },
      ]);

      /* The name of the step ends at 220, the step beside it and its name at 199 */
      expect(getAgentStepLinkPoints(getNode('agent'), getNode('route'), false)).toEqual([
        new Point(190, 137.5),
        new Point(224, 137.5),
        new Point(224, 207),
        new Point(795, 207),
        new Point(795, 800),
      ]);
    });
  });

  describe('roundedPath', () => {
    it('should round the corners of the path', () => {
      expect(roundedPath([new Point(0, 0), new Point(0, 100), new Point(100, 100)])).toBe(
        'M0 0 L0 94 Q0 100 6 100 L100 100',
      );
    });

    it('should keep a sharp corner between segments too short to round', () => {
      expect(roundedPath([new Point(0, 0), new Point(0, 0.6), new Point(10, 0.6)])).toBe('M0 0 L0 0.6 L10 0.6');
    });
  });
});
