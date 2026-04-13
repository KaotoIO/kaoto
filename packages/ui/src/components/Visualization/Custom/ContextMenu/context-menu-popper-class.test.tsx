const withContextMenuMock = jest.fn(() => (Component: unknown) => Component);
const withSelectionMock = jest.fn(() => (Component: unknown) => Component);

jest.mock('@patternfly/react-topology', () => {
  const actual = jest.requireActual('@patternfly/react-topology');
  return {
    ...actual,
    withContextMenu: (...args: unknown[]) => withContextMenuMock(...args),
    withSelection: (...args: unknown[]) => withSelectionMock(...args),
  };
});

describe('context menu popper class wiring', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should use the dedicated popper class for node and group context menus', async () => {
    const { NODE_CONTEXT_MENU_POPPER_CLASS } = await import('./NodeContextMenu');

    await import('../Node/CustomNode');
    await import('../Group/CustomGroup');

    const callsWithPopperClass = withContextMenuMock.mock.calls.filter(
      ([, , className]) => className === NODE_CONTEXT_MENU_POPPER_CLASS,
    );

    expect(callsWithPopperClass.length).toBeGreaterThanOrEqual(2);
  });
});
