import { CanvasFormTabsProvider } from '@kaoto/forms';
import { render } from '@testing-library/react';

import { CanvasFormHeader } from './CanvasFormHeader';

describe('CanvasFormHeader', () => {
  it('renders correctly', () => {
    const { asFragment } = render(
      <CanvasFormTabsProvider>
        <CanvasFormHeader nodeId="nodeId" nodeIcon="nodeIcon" title="title" />
      </CanvasFormTabsProvider>,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
