import { render, screen } from '@testing-library/react';

import { OverlayIcon } from './OverlayIcon';

vi.unmock('@patternfly/react-icons');

describe('OverlayIcon demo mapping', () => {
  it('renders distinct decorative example shapes', () => {
    const paths = ['circle', 'diamond', 'flag', 'info'].map((icon) => {
      const { container, unmount } = render(<OverlayIcon icon={icon} />);
      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      const path = container.querySelector('path')!.getAttribute('d');
      unmount();
      return path;
    });
    expect(new Set(paths).size).toBe(4);
  });

  it.each(['not-known', '__proto__', 'constructor'])('provides an explicit fallback for %s', (icon) => {
    render(<OverlayIcon icon={icon} />);
    expect(screen.getByText('Unknown marker icon')).toBeInTheDocument();
  });
});
