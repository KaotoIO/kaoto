import { FunctionComponent, useContext } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CanvasFormTabsProvider, CanvasFormTabsContext } from './canvas-form-tabs.provider';
import { FormTabsModes } from '../components/Visualization/Canvas';

describe('CanvasFormTabsProvider', () => {
  it('should provide default selectedTab value', () => {
    const TestComponent: FunctionComponent = () => {
      const { selectedTab } = useContext(CanvasFormTabsContext);
      return <div data-testid="selected-tab">{selectedTab}</div>;
    };

    render(
      <CanvasFormTabsProvider>
        <TestComponent />
      </CanvasFormTabsProvider>,
    );

    const selected = screen.getByTestId('selected-tab');
    expect(selected).toHaveTextContent(FormTabsModes.REQUIRED_FIELDS);
  });

  it('should update selectedTab on tab change', () => {
    const TestComponent: FunctionComponent = () => {
      const { selectedTab, onTabChange } = useContext(CanvasFormTabsContext);
      return (
        <div>
          <div data-testid="selected-tab">{selectedTab}</div>
          <button id={FormTabsModes.REQUIRED_FIELDS} onClick={(e) => onTabChange(e, true)} data-testid="required-tab">
            Required Tab
          </button>
          <button id={FormTabsModes.ALL_FIELDS} onClick={(e) => onTabChange(e, true)} data-testid="all-fields-tab">
            All Fields Tab
          </button>
          <button
            id={FormTabsModes.USER_MODIFIED}
            onClick={(e) => onTabChange(e, true)}
            data-testid="user-modified-tab"
          >
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
    expect(screen.getByTestId('selected-tab')).toHaveTextContent(FormTabsModes.ALL_FIELDS);

    const modifiedTab = screen.getByTestId('user-modified-tab');
    fireEvent.click(modifiedTab);
    expect(screen.getByTestId('selected-tab')).toHaveTextContent(FormTabsModes.USER_MODIFIED);

    const requiredTab = screen.getByTestId('required-tab');
    fireEvent.click(requiredTab);
    expect(screen.getByTestId('selected-tab')).toHaveTextContent(FormTabsModes.REQUIRED_FIELDS);
  });
});
