import { NewBeanModal } from './NewBeanModal';
import { fireEvent, render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { useSchemasStore } from '../../../store';
import * as beansSchema from '@kaoto-next/camel-catalog/camelYamlDsl-beans.json';
describe('NewBeanModal', () => {
  useSchemasStore.setState({
    schemas: { beans: { name: 'beans', tags: [], version: '0', uri: '', schema: beansSchema } },
  });

  it('should render', () => {
    const mockOnCreate = jest.fn();
    const mockOnCancel = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(
      <NewBeanModal
        isOpen={true}
        onCancelCreateBean={mockOnCancel}
        onCreateBean={mockOnCreate}
        propertyTitle={'foo'}
      />,
    );
    const nameTeextbox = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Name');
    fireEvent.input(nameTeextbox[0], { target: { value: 'foo' } });
    const createButton = screen
      .getAllByRole('button')
      .filter((button) => button.textContent && button.textContent === 'Create');
    expect(createButton).toHaveLength(1);
    expect(mockOnCreate.mock.calls).toHaveLength(0);
    fireEvent.click(createButton[0]);
    expect(mockOnCreate.mock.calls).toHaveLength(1);
    expect(mockOnCreate.mock.calls[0][0].name).toEqual('foo');

    const cancelButton = screen
      .getAllByRole('button')
      .filter((button) => button.textContent && button.textContent === 'Cancel');
    expect(cancelButton).toHaveLength(1);
    expect(mockOnCancel.mock.calls).toHaveLength(0);
    fireEvent.click(cancelButton[0]);
    expect(mockOnCancel.mock.calls).toHaveLength(1);
  });
});
