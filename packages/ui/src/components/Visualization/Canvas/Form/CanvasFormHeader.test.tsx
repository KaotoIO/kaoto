import { CanvasFormTabsProvider } from '@kaoto/forms';
import { act, render } from '@testing-library/react';

import { CanvasFormHeader } from './CanvasFormHeader';

describe('CanvasFormHeader', () => {
  it('renders correctly', async () => {
    const { asFragment } = await act(async () =>
      render(
        <CanvasFormTabsProvider>
          <CanvasFormHeader nodeId="nodeId" title="title" iconUrl="test" />
        </CanvasFormTabsProvider>,
      ),
    );

    expect(asFragment()).toMatchSnapshot();
  });
});
