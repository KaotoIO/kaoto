import { fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, useContext } from 'react';
import { CanvasFormTabsContext, CanvasFormTabsProvider } from './canvas-form-tabs.provider';

describe('CanvasFormTabsProvider', () => {
  it('should provide default selectedTab value', () => {
    const TestComponent: FunctionComponent = () => {
      const { selectedTab } = useContext(CanvasFormTabsContext)!;
      return <div data-testid="selected-tab">{selectedTab}</div>;
    };

    render(
      <CanvasFormTabsProvider>
        <TestComponent />
      </CanvasFormTabsProvider>,
    );

    const selected = screen.getByTestId('selected-tab');
    expect(selected).toHaveTextContent('Required');
  });

  it('should update selectedTab on tab change', () => {
    const TestComponent: FunctionComponent = () => {
      const { selectedTab, onTabChange } = useContext(CanvasFormTabsContext)!;
      return (
        <div>
          <div data-testid="selected-tab">{selectedTab}</div>
          <button id="Required" onClick={onTabChange} data-testid="required-tab">
            Required Tab
          </button>
          <button id="All" onClick={onTabChange} data-testid="all-fields-tab">
            All Fields Tab
          </button>
          <button id="Modified" onClick={onTabChange} data-testid="user-modified-tab">
            User Modified Tab
          </button>
        </div>
      );
    };

    render(
      <CanvasFormTabsProvider>
        <TestComponent />
      </CanvasFormTabsProvider>,
    );

    const allTab = screen.getByTestId('all-fields-tab');
    fireEvent.click(allTab);
    expect(screen.getByTestId('selected-tab')).toHaveTextContent('All');

    const modifiedTab = screen.getByTestId('user-modified-tab');
    fireEvent.click(modifiedTab);
    expect(screen.getByTestId('selected-tab')).toHaveTextContent('Modified');

    const requiredTab = screen.getByTestId('required-tab');
    fireEvent.click(requiredTab);
    expect(screen.getByTestId('selected-tab')).toHaveTextContent('Required');
  });
});
