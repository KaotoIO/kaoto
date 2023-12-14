import { NewBeanModal } from './NewBeanModal';
import { fireEvent, render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import * as entitiesCatalog from '@kaoto-next/camel-catalog/camel-catalog-aggregate-entities.json';
import { CamelCatalogService, CatalogKind, ICamelProcessorDefinition } from '../../../models';
describe('NewBeanModal', () => {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  delete (entitiesCatalog as any).default;
  CamelCatalogService.setCatalogKey(
    CatalogKind.Entity,
    entitiesCatalog as unknown as Record<string, ICamelProcessorDefinition>,
  );

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
