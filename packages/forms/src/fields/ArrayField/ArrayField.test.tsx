import { act, fireEvent, render, RenderResult } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';

import { FieldTestProvider } from '../../testing/FieldTestProvider';
import { ROOT_PATH } from '../../utils';
import { ArrayField } from './ArrayField';

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  let idCounter = 0;

  return {
    ...actual,
    getHexaDecimalRandomId: vi.fn().mockImplementation(() => `mocked-id-${idCounter++}`),
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

  it('adds new items in front of the existing ones, created from the first schema of a tuple', async () => {
    const tupleSchema: JSONSchema4 = { ...schema, items: [{ type: 'number', default: 8080 }, { type: 'string' }] };
    const { Provider, onChange } = FieldTestProvider({ schema: tupleSchema, model: [80] });
    let wrapper: RenderResult | undefined;
    await act(async () => {
      wrapper = render(
        <Provider>
          <ArrayField propName={ROOT_PATH} />
        </Provider>,
      );
    });

    fireEvent.click(wrapper!.getByTestId(`${ROOT_PATH}__add`));

    expect(onChange).toHaveBeenCalledWith(ROOT_PATH, [8080, 80]);
  });

  it('is titled after its property when the schema has no title', async () => {
    const { Provider } = FieldTestProvider({ schema: { ...schema, title: undefined } });
    let wrapper: RenderResult | undefined;
    await act(async () => {
      wrapper = render(
        <Provider>
          <ArrayField propName="#.endpoints" />
        </Provider>,
      );
    });

    expect(wrapper!.getByText('Endpoints')).toBeInTheDocument();
  });

  it('fails without a schema for its items', () => {
    const { Provider } = FieldTestProvider({ schema: { ...schema, items: undefined } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      render(
        <Provider>
          <ArrayField propName="#.endpoints" />
        </Provider>,
      ),
    ).toThrow('ArrayField: items schema is not defined for #.endpoints');
    consoleError.mockRestore();
  });
});
