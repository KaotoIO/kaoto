import { fireEvent, render, screen } from '@testing-library/react';
import { CanvasFormTabsContext, CanvasFormTabsContextResult } from '../providers';
import { NoFieldFound } from './NoFieldFound';

describe('NoFieldFound Component', () => {
  it('should render the alert with the correct tab name', () => {
    const mockContextValue: CanvasFormTabsContextResult = {
      selectedTab: 'Required',
      setSelectedTab: jest.fn(),
    };

    render(
      <CanvasFormTabsContext.Provider value={mockContextValue}>
        <NoFieldFound />
      </CanvasFormTabsContext.Provider>,
    );

    expect(screen.getByTestId('no-field-found')).toBeInTheDocument();
    expect(screen.getByText('No Required fields found')).toBeInTheDocument();
  });

  it('should not suggest switching tabs when the All tab is already selected', () => {
    const mockContextValue: CanvasFormTabsContextResult = {
      selectedTab: 'All',
      setSelectedTab: jest.fn(),
    };

    render(
      <CanvasFormTabsContext.Provider value={mockContextValue}>
        <NoFieldFound />
      </CanvasFormTabsContext.Provider>,
    );

    expect(screen.getByText('No fields found')).toBeInTheDocument();
    expect(screen.getByText('No field found matching this criteria.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument();
  });

  it('should call onTabChange when the link is clicked', () => {
    const mockContextValue: CanvasFormTabsContextResult = {
      selectedTab: 'Required',
      setSelectedTab: jest.fn(),
    };

    render(
      <CanvasFormTabsContext.Provider value={mockContextValue}>
        <NoFieldFound />
      </CanvasFormTabsContext.Provider>,
    );

    const link = screen.getByText('Switch to All tab');
    fireEvent.click(link);

    expect(mockContextValue.setSelectedTab).toHaveBeenCalledWith('All');
  });
});
