import { act, renderHook } from '@testing-library/react';
import { createElement, ReactNode } from 'react';

import { EntitiesContext } from '../../../providers';
import { ActionConfirmationModalContext } from '../../../providers/action-confirmation-modal.provider';
import { createSimpleRestVisualEntity } from '../../../stubs';
import { useRestDslOperations } from './useRestDslOperations';

describe('useRestDslOperations', () => {
  const mockSetSelection = jest.fn();
  const mockUpdateEntitiesFromCamelResource = jest.fn();
  const mockAddNewEntity = jest.fn();
  const mockRemoveEntity = jest.fn();

  const baseProps = {
    restEntities: [createSimpleRestVisualEntity('rest-1')],
    restConfiguration: undefined,
    canAddRestEntities: true,
    canDeleteRestEntities: true,
    setSelection: mockSetSelection,
  };

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      ActionConfirmationModalContext.Provider,
      { value: undefined },
      createElement(
        EntitiesContext.Provider,
        {
          value: {
            camelResource: {
              addNewEntity: mockAddNewEntity,
              removeEntity: mockRemoveEntity,
            },
            updateEntitiesFromCamelResource: mockUpdateEntitiesFromCamelResource,
          } as never,
        },
        children,
      ),
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with closed add operation modal', () => {
    const { result } = renderHook(() => useRestDslOperations(baseProps), { wrapper });

    expect(result.current.isAddOperationOpen).toBe(false);
    expect(result.current.addOperationRestId).toBeUndefined();
  });

  it('opens add operation modal for specific rest entity', () => {
    const { result } = renderHook(() => useRestDslOperations(baseProps), { wrapper });

    act(() => {
      result.current.openAddOperationModal('rest-1');
    });

    expect(result.current.isAddOperationOpen).toBe(true);
    expect(result.current.addOperationRestId).toBe('rest-1');
  });

  it('closes add operation modal', () => {
    const { result } = renderHook(() => useRestDslOperations(baseProps), { wrapper });

    act(() => {
      result.current.openAddOperationModal('rest-1');
    });

    act(() => {
      result.current.closeAddOperationModal();
    });

    expect(result.current.isAddOperationOpen).toBe(false);
    expect(result.current.addOperationRestId).toBeUndefined();
  });

  it('creates a new operation', () => {
    const { result } = renderHook(() => useRestDslOperations(baseProps), { wrapper });

    act(() => {
      result.current.handleCreateOperation('rest-1', 'get', 'newOp', '/new-path');
    });

    expect(mockUpdateEntitiesFromCamelResource).toHaveBeenCalled();
    expect(mockSetSelection).toHaveBeenCalledWith({
      kind: 'operation',
      restId: 'rest-1',
      verb: 'get',
      index: 2,
    });
  });

  it('creates a new rest entity', () => {
    mockAddNewEntity.mockReturnValue('rest-2');
    const { result } = renderHook(() => useRestDslOperations(baseProps), { wrapper });

    act(() => {
      result.current.handleCreateRest();
    });

    expect(mockAddNewEntity).toHaveBeenCalledWith('rest');
    expect(mockUpdateEntitiesFromCamelResource).toHaveBeenCalled();
    expect(mockSetSelection).toHaveBeenCalledWith({
      kind: 'rest',
      restId: 'rest-2',
    });
  });

  it('does not create rest when canAddRestEntities is false', () => {
    const { result } = renderHook(
      () =>
        useRestDslOperations({
          ...baseProps,
          canAddRestEntities: false,
        }),
      { wrapper },
    );

    act(() => {
      result.current.handleCreateRest();
    });

    expect(mockAddNewEntity).not.toHaveBeenCalled();
  });
});
