import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { screen } from '@testing-library/dom';
import { act, fireEvent, render } from '@testing-library/react';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { NewBeanModal } from './NewBeanModal';
import { resolveSchemaWithRef } from '../../../utils';
import { KaotoSchemaDefinition } from '../../../models';

describe('NewBeanModal', () => {
  let beanSchema: KaotoSchemaDefinition['schema'];
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    beanSchema = resolveSchemaWithRef(
      catalogsMap.entitiesCatalog.bean.propertiesSchema!.items!,
      catalogsMap.entitiesCatalog.bean.propertiesSchema!.definitions!,
    );
  });

  it('should render', async () => {
    const mockOnCreate = jest.fn();
    const mockOnCancel = jest.fn();

    render(
      <NewBeanModal
        beanSchema={beanSchema}
        isOpen
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
