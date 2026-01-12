import { fireEvent, render, screen } from '@testing-library/react';

import { VisibleFlowsContext, VisibleFlowsContextResult } from '../../../../providers';
import { GraphContextMenuFn } from './CustomGraph';

describe('GraphContextMenuFn', () => {
  const mockVisibleFlowsContext: VisibleFlowsContextResult = {
    allFlowsVisible: false,
    visibleFlows: {},
    visualFlowsApi: {
      showFlows: jest.fn(),
      hideFlows: jest.fn(),
      toggleFlowVisible: jest.fn(),
      clearFlows: jest.fn(),
      initVisibleFlows: jest.fn(),
      renameFlow: jest.fn(),
    } as unknown as VisibleFlowsContextResult['visualFlowsApi'],
  };

  const defaultOptions = {
    entityContextMenuFn: jest.fn().mockReturnValue([]),
    canPasteEntity: false,
    pasteEntity: jest.fn(),
  };

  const renderWithContext = (items: React.ReactNode) => {
    return render(<VisibleFlowsContext.Provider value={mockVisibleFlowsContext}>{items}</VisibleFlowsContext.Provider>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    defaultOptions.entityContextMenuFn = jest.fn().mockReturnValue([]);
    defaultOptions.pasteEntity = jest.fn();
  });

  it('renders Show all and Hide all menu items', () => {
    const items = GraphContextMenuFn({ ...defaultOptions });

    renderWithContext(<>{items}</>);

    expect(screen.getByTestId('context-menu-item-show-all')).toBeInTheDocument();
    expect(screen.getByText('Show all')).toBeInTheDocument();

    expect(screen.getByTestId('context-menu-item-hide-all')).toBeInTheDocument();
    expect(screen.getByText('Hide all')).toBeInTheDocument();
  });

  it('renders Paste menu item', () => {
    const items = GraphContextMenuFn({ ...defaultOptions });

    renderWithContext(<>{items}</>);

    expect(screen.getByTestId('context-menu-item-paste')).toBeInTheDocument();
    expect(screen.getByText('Paste')).toBeInTheDocument();
  });

  it('does not render New submenu when no entities exist', () => {
    const items = GraphContextMenuFn({ ...defaultOptions });

    renderWithContext(<>{items}</>);

    expect(screen.queryByTestId('context-menu-item-new-entity')).not.toBeInTheDocument();
  });

  it('renders New submenu when entities exist', () => {
    const entities = [<div key="entity-1">Entity 1</div>];
    const entityContextMenuFn = jest.fn().mockReturnValue(entities);
    const items = GraphContextMenuFn({ ...defaultOptions, entityContextMenuFn });

    renderWithContext(<>{items}</>);

    expect(screen.getByTestId('context-menu-item-new-entity')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('calls entityContextMenuFn to get entities', () => {
    GraphContextMenuFn({ ...defaultOptions });

    expect(defaultOptions.entityContextMenuFn).toHaveBeenCalledTimes(1);
  });

  it('Paste menu item is disabled when canPasteEntity is false', () => {
    const items = GraphContextMenuFn({ ...defaultOptions, canPasteEntity: false });

    renderWithContext(<>{items}</>);

    const pasteItem = screen.getByTestId('context-menu-item-paste');
    expect(pasteItem).toHaveClass('pf-m-disabled');
  });

  it('Paste menu item is enabled when canPasteEntity is true', () => {
    const items = GraphContextMenuFn({ ...defaultOptions, canPasteEntity: true });

    renderWithContext(<>{items}</>);

    const pasteItem = screen.getByTestId('context-menu-item-paste');
    expect(pasteItem).not.toHaveClass('pf-m-disabled');
  });

  it('Paste menu item calls pasteEntity on click', () => {
    const pasteEntity = jest.fn();
    const items = GraphContextMenuFn({ ...defaultOptions, canPasteEntity: true, pasteEntity });

    renderWithContext(<>{items}</>);

    const pasteButton = screen.getByText('Paste').closest('button')!;
    fireEvent.click(pasteButton);

    expect(pasteEntity).toHaveBeenCalledTimes(1);
  });

  it('Show all menu item calls showFlows on click', () => {
    const items = GraphContextMenuFn({ ...defaultOptions });

    renderWithContext(<>{items}</>);

    const showAllButton = screen.getByText('Show all').closest('button')!;
    fireEvent.click(showAllButton);

    expect(mockVisibleFlowsContext.visualFlowsApi?.showFlows).toHaveBeenCalledTimes(1);
  });

  it('Hide all menu item calls hideFlows on click', () => {
    const items = GraphContextMenuFn({ ...defaultOptions });

    renderWithContext(<>{items}</>);

    const hideAllButton = screen.getByText('Hide all').closest('button')!;
    fireEvent.click(hideAllButton);

    expect(mockVisibleFlowsContext.visualFlowsApi?.hideFlows).toHaveBeenCalledTimes(1);
  });
});
