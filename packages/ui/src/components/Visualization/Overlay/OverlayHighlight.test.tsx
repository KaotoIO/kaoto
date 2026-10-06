import { render } from '@testing-library/react';

import { EdgeOverlayHighlight, NodeOverlayHighlight } from './OverlayHighlight';

describe('Overlay highlights', () => {
  it('follows the supplied visual bounds without intercepting input', () => {
    const { container, rerender } = render(
      <svg>
        <NodeOverlayHighlight bounds={{ x: 10, y: 20, width: 60, height: 60 }} />
      </svg>,
    );
    const rect = container.querySelector('rect')!;
    expect(rect).toHaveAttribute('x', '6');
    expect(rect).toHaveAttribute('y', '16');
    expect(rect).toHaveAttribute('width', '68');
    expect(rect).toHaveAttribute('height', '68');
    expect(rect).toHaveAttribute('fill', 'none');
    expect(rect).toHaveAttribute('pointer-events', 'none');
    expect(rect).toHaveAttribute('aria-hidden', 'true');
    rerender(
      <svg>
        <NodeOverlayHighlight bounds={{ x: 100, y: 50, width: 90, height: 75 }} />
      </svg>,
    );
    expect(rect).toHaveAttribute('x', '96');
    expect(rect).toHaveAttribute('width', '98');
  });

  it.each(['neutral', 'info', 'success', 'warning', 'error'] as const)(
    'renders only the supplied edge for %s tone',
    (tone) => {
      const { container, rerender } = render(
        <svg>
          <EdgeOverlayHighlight path="M10 20 L30 40 L50 20" tone={tone} />
        </svg>,
      );
      const path = container.querySelector('path')!;
      expect(path).toHaveAttribute('d', 'M10 20 L30 40 L50 20');
      expect(path).toHaveAttribute('pointer-events', 'none');
      expect(container.querySelectorAll('path')).toHaveLength(1);
      rerender(
        <svg>
          <EdgeOverlayHighlight path="M50 0 L70 80" tone={tone} />
        </svg>,
      );
      expect(path).toHaveAttribute('d', 'M50 0 L70 80');
    },
  );

  it.each([
    ['normal', '3', undefined],
    ['strong', '5', undefined],
    ['subdued', '2', '4 3'],
  ] as const)('makes %s emphasis distinguishable by stroke', (emphasis, width, dash) => {
    const { container } = render(
      <svg>
        <EdgeOverlayHighlight path="M0 0 L10 10" emphasis={emphasis} />
      </svg>,
    );
    const path = container.querySelector('path')!;
    expect(path).toHaveAttribute('stroke-width', width);
    if (dash) expect(path).toHaveAttribute('stroke-dasharray', dash);
    else expect(path).not.toHaveAttribute('stroke-dasharray');
  });
});
