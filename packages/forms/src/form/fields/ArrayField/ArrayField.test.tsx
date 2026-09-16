import { act, fireEvent, render, RenderResult } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';
import { FieldTestProvider } from '../../testing/FieldTestProvider';
import { ROOT_PATH } from '../../utils';
import { ArrayField } from './ArrayField';

jest.mock('../../utils', () => {
  const actual = jest.requireActual('../../utils');
  let idCounter = 0;

  return {
    ...actual,
    getHexaDecimalRandomId: jest.fn().mockImplementation(() => `mocked-id-${idCounter++}`),
  };
});

describe('ArrayField', () => {
  const schema: JSONSchema4 = {
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

    const fieldActions = wrapper!.getByTestId(`#.0__field-actions`);
    fireEvent.click(fieldActions);

    const clearButton = await wrapper!.findByTestId(`#.0__clear`);
    fireEvent.click(clearButton);

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
