import { render } from '@testing-library/react';

import { CanvasFormHeader } from './CanvasFormHeader';

describe('CanvasFormHeader', () => {
  it('renders correctly', () => {
    const { asFragment } = render(<CanvasFormHeader nodeId="nodeId" title="title" iconUrl="test" />);

    expect(asFragment()).toMatchSnapshot();
  });

  it('calls onClose when clicking the close button', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<CanvasFormHeader nodeId="nodeId" title="title" iconUrl="test" onClose={onClose} />);

    getByTestId('close-side-bar').click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
