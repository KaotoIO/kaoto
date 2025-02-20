import { fireEvent, render, screen } from '@testing-library/react';
import { CanvasFormTabsContext, CanvasFormTabsContextResult } from '../../providers';
import { NoFieldFound } from './NoFieldFound';

describe('NoFieldFound Component', () => {
  it('should render the alert with the correct tab name', () => {
    const mockContextValue: CanvasFormTabsContextResult = {
      selectedTab: 'Required',
      onTabChange: jest.fn(),
    };

    render(
      <CanvasFormTabsContext.Provider value={mockContextValue}>
        <NoFieldFound />
      </CanvasFormTabsContext.Provider>,
    );

    expect(screen.getByTestId('no-field-found')).toBeInTheDocument();
    expect(screen.getByText('No Required fields found')).toBeInTheDocument();
  });

  it('should call onTabChange when the button is clicked', () => {
    const mockContextValue: CanvasFormTabsContextResult = {
      selectedTab: 'Required',
      onTabChange: jest.fn(),
    };

    render(
      <CanvasFormTabsContext.Provider value={mockContextValue}>
        <NoFieldFound />
      </CanvasFormTabsContext.Provider>,
    );

    const button = screen.getByRole('button', { name: /All/i });
    fireEvent.click(button);

    expect(mockContextValue.onTabChange).toHaveBeenCalled();
  });
});
