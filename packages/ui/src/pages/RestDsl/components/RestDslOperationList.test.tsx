import { fireEvent, render, screen } from '@testing-library/react';

import { createSimpleRestVisualEntity } from '../../../stubs';
import { RestVerb } from '../restDslTypes';
import { RestDslOperationList } from './RestDslOperationList';

describe('RestDslOperationList', () => {
  const mockRestEntity = createSimpleRestVisualEntity('rest-1');

  const mockRestDefinition = {
    get: [
      { id: 'op1', path: '/users' },
      { id: 'op2', path: '/posts' },
    ],
  };

  const baseProps = {
    restEntity: mockRestEntity,
    restDefinition: mockRestDefinition,
    restMethods: ['get', 'post', 'put', 'delete'] as RestVerb[],
    selection: undefined,
    onSelectOperation: jest.fn(),
    onDeleteOperation: jest.fn(),
    getListItemClass: jest.fn(() => 'rest-dsl-nav-item'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders operations for specified verb', () => {
    render(<RestDslOperationList {...baseProps} />);

    expect(screen.getByText('/users')).toBeInTheDocument();
    expect(screen.getByText('/posts')).toBeInTheDocument();
  });

  it('renders verb badge', () => {
    render(<RestDslOperationList {...baseProps} />);

    expect(screen.getAllByText('GET').length).toBeGreaterThan(0);
  });

  it('calls onSelectOperation when operation is clicked', () => {
    render(<RestDslOperationList {...baseProps} />);

    const firstOperation = screen.getByText('/users');
    fireEvent.click(firstOperation);

    expect(baseProps.onSelectOperation).toHaveBeenCalledWith('rest-1', 'get', 0);
  });

  it('calls onDeleteOperation when delete button is clicked', () => {
    render(<RestDslOperationList {...baseProps} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(baseProps.onDeleteOperation).toHaveBeenCalledWith(mockRestEntity, 'get', 0);
  });

  it('does not render operations for verbs without operations', () => {
    render(<RestDslOperationList {...baseProps} />);

    expect(screen.queryByText('POST')).not.toBeInTheDocument();
    expect(screen.queryByText('PUT')).not.toBeInTheDocument();
  });
});
