import { render, screen } from '@testing-library/react';

import { CanvasEdgeOverlays, getOverlayEdgeMidpoint } from './CanvasElementOverlays';

it.each([
  {
    points: [
      { x: 10, y: 20 },
      { x: 110, y: 20 },
    ],
    midpoint: { x: 60, y: 20 },
  },
  {
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 200 },
    ],
    midpoint: { x: 100, y: 50 },
  },
  {
    points: [
      { x: 10, y: 20 },
      { x: 10, y: 20 },
    ],
    midpoint: { x: 10, y: 20 },
  },
])('centers annotations along the rendered edge: $points', ({ points, midpoint }) => {
  expect(getOverlayEdgeMidpoint(points)).toEqual(midpoint);
});

it('stacks multiple edge annotations centered above the actual edge midpoint', () => {
  const { container } = render(
    <svg>
      <CanvasEdgeOverlays
        path="M0 0 L100 0 L100 200"
        points={[
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 200 },
        ]}
        overlays={['First', 'Second'].map((text) => ({
          key: text,
          entry: {
            id: text,
            kind: 'annotation',
            target: { kind: 'edge', id: 'edge' },
            text,
            interaction: { accessibleLabel: text },
          },
        }))}
      />
    </svg>,
  );
  expect(screen.getByRole('img', { name: 'First: First' })).toBeInTheDocument();
  const slots = container.querySelectorAll('foreignObject');
  expect(slots[0]).toHaveAttribute('x', '20');
  expect(slots[0]).toHaveAttribute('y', '18');
  expect(slots[1]).toHaveAttribute('x', '20');
  expect(slots[1]).toHaveAttribute('y', '-14');
});
