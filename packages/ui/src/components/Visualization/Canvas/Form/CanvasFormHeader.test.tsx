import { render } from '@testing-library/react';
import { CanvasFormHeader } from './CanvasFormHeader';

describe('CanvasFormHeader', () => {
  it('renders correctly', () => {
    const { asFragment } = render(<CanvasFormHeader nodeId="nodeId" nodeIcon="nodeIcon" title="title" />);
    expect(asFragment()).toMatchSnapshot();
  });
});
