import { NewBeanModal } from './NewBeanModal';
import { fireEvent, render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import * as catalogIndex from '@kaoto-next/camel-catalog/index.json';
import { act } from 'react-dom/test-utils';

describe('NewBeanModal', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let beanSchema: any;
  beforeAll(async () => {
    const entitiesCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.entities.file);
    beanSchema = entitiesCatalog.bean.propertiesSchema;
  });

  it('should render', async () => {
    const mockOnCreate = jest.fn();
    const mockOnCancel = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(
      <NewBeanModal
        beanSchema={beanSchema}
        isOpen={true}
        onCancelCreateBean={mockOnCancel}
        onCreateBean={mockOnCreate}
        propertyTitle={'foo'}
      />,
    );
    const nameTeextbox = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Name');
    fireEvent.input(nameTeextbox[0], { target: { value: 'foo' } });
    const labelTeextbox = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Type');
    fireEvent.input(labelTeextbox[0], { target: { value: 'bar' } });
    const createButton = screen
      .getAllByRole('button')
      .filter((button) => button.textContent && button.textContent === 'Create');
    expect(createButton).toHaveLength(1);
    expect(mockOnCreate.mock.calls).toHaveLength(0);
    await act(async () => fireEvent.click(createButton[0]));
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
