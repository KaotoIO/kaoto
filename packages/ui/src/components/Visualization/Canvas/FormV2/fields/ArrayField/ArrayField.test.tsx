import { act, fireEvent, render, RenderResult } from '@testing-library/react';
import { KaotoSchemaDefinition } from '../../../../../../models';
import { ROOT_PATH } from '../../../../../../utils';
import { FieldTestProvider } from '../../testing/FieldTestProvider';
import { ArrayField } from './ArrayField';

describe('ArrayField', () => {
  const schema: KaotoSchemaDefinition['schema'] = {
    title: 'Test Array Field',
    type: 'array',
    description: 'A test array field',
    items: { type: 'string' },
  };

  it('should render the ArrayField component', async () => {
    const { Provider } = FieldTestProvider({ schema });

    let wrapper: RenderResult | undefined;
    await act(async () => {
      wrapper = render(
        <Provider>
          <ArrayField propName={ROOT_PATH} />
        </Provider>,
      );
    });

    expect(wrapper?.getByText('Test Array Field')).toBeInTheDocument();
  });

  it('should add a new item when the add button is clicked', async () => {
    const { Provider, onChange } = FieldTestProvider({ schema });

    let wrapper: RenderResult | undefined;
    await act(async () => {
      wrapper = render(
        <Provider>
          <ArrayField propName={ROOT_PATH} />
        </Provider>,
      );
    });

    const addButton = wrapper!.getByTestId(`${ROOT_PATH}__add`);
    fireEvent.click(addButton);

    expect(onChange).toHaveBeenCalledWith(ROOT_PATH, expect.any(Array));
  });

  it('should remove an item when the remove button is clicked', async () => {
    const { Provider, onChange } = FieldTestProvider({ schema, model: ['item1', 'item2'] });

    let wrapper: RenderResult | undefined;
    await act(async () => {
      wrapper = render(
        <Provider>
          <ArrayField propName={ROOT_PATH} />
        </Provider>,
      );
    });

    const removeButtons = await wrapper!.findAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith(ROOT_PATH, ['item2']);
  });

  it('should display the correct number of items', async () => {
    const { Provider } = FieldTestProvider({ schema, model: ['item1', 'item2', 'item3'] });

    let wrapper: RenderResult | undefined;
    await act(async () => {
      wrapper = render(
        <Provider>
          <ArrayField propName={ROOT_PATH} />
        </Provider>,
      );
    });

    expect(wrapper!.getAllByRole('textbox').length).toBe(3);
  });
});
