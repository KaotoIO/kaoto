import { CanvasFormTabsProvider } from '@kaoto/forms';
import { act, render } from '@testing-library/react';

import { CatalogKind } from '../../../../models';
import { CanvasFormHeader } from './CanvasFormHeader';

describe('CanvasFormHeader', () => {
  it('renders correctly', async () => {
    const { asFragment } = await act(async () =>
      render(
        <CanvasFormTabsProvider>
          <CanvasFormHeader nodeId="nodeId" catalogKind={CatalogKind.Component} name="log" title="title" />
        </CanvasFormTabsProvider>,
      ),
    );

    expect(asFragment()).toMatchSnapshot();
  });
});
