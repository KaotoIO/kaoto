import { fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, useContext } from 'react';

import { CanvasFormTabsContext, CanvasFormTabsProvider } from '../providers/canvas-form-tabs.provider';
import { FormSectionTabs } from './FormSectionTabs';

const SelectedTabProbe: FunctionComponent = () => {
  const { selectedTab } = useContext(CanvasFormTabsContext);
  return <span data-testid="selected-tab-probe">{selectedTab}</span>;
};

describe('FormSectionTabs', () => {
  it('renders the three tabs with the selected one marked', () => {
    render(
      <CanvasFormTabsProvider tab="Required" showSectionTabs>
        <FormSectionTabs />
      </CanvasFormTabsProvider>,
    );

    expect(screen.getByTestId('tab-Required')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tab-All')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('tab-Modified')).toHaveAttribute('aria-selected', 'false');
  });

  it('updates the selected tab when clicking a tab', () => {
    render(
      <CanvasFormTabsProvider tab="Required" showSectionTabs>
        <FormSectionTabs />
        <SelectedTabProbe />
      </CanvasFormTabsProvider>,
    );

    fireEvent.click(screen.getByTestId('tab-Modified'));

    expect(screen.getByTestId('tab-Modified')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('selected-tab-probe')).toHaveTextContent('Modified');
  });
});
