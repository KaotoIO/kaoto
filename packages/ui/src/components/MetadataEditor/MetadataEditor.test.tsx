import { MetadataEditor } from './MetadataEditor';
import { mockModel, mockSchema } from './TestUtil';
import { fireEvent, render, screen } from '@testing-library/react';
import { cloneDeep } from 'lodash';

describe('MetadataEditor.tsx', () => {
  test('component renders', () => {
    const wrapper = render(
      <MetadataEditor name="beans" schema={mockSchema.beans} metadata={[]} onChangeModel={() => {}} />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('Details disabled if empty', async () => {
    render(<MetadataEditor name="beans" schema={mockSchema.beans} metadata={[]} onChangeModel={() => {}} />);
    const inputs = screen.getAllByRole('textbox').filter((input) => input.getAttribute('name') === '#.name');
    expect(inputs.length).toBe(1);
    expect(inputs[0]).toBeDisabled();
    const addPropBtn = screen.getByTestId('#.properties__add');
    expect(addPropBtn).toBeDisabled();
  });

  test('Details enabled if select', async () => {
    render(
      <MetadataEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={cloneDeep(mockModel.beans)}
        onChangeModel={() => {}}
      />,
    );
    const row = screen.getByTestId('metadata-row-0');
    fireEvent.click(row);
    const inputs = screen.getAllByRole('textbox').filter((input) => input.getAttribute('name') === '#.name');
    expect(inputs.length).toBe(1);
    expect(inputs[0]).toBeEnabled();
    const addPropBtn = screen.getByTestId('#.properties__add');
    expect(addPropBtn).toBeEnabled();
  });

  test('Add a bean and save', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let changed: any;
    render(
      <MetadataEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={metadata}
        onChangeModel={(model) => {
          changed = model;
        }}
      />,
    );
    const addBeanBtn = screen.getAllByTestId('metadata-add-beans-btn')[0];
    fireEvent.click(addBeanBtn);
    const beanNameInput = screen.getAllByRole('textbox').filter((input) => input.getAttribute('name') === '#.name')[0];
    fireEvent.input(beanNameInput, { target: { value: 'bean1' } });
    const beanTypeInput = screen.getAllByRole('textbox').filter((input) => input.getAttribute('name') === '#.type')[0];
    fireEvent.input(beanTypeInput, { target: { value: 'io.kaoto.MyBean' } });

    expect(changed[0].name).toBe('bean1');
    expect(changed[0].type).toBe('io.kaoto.MyBean');
  });

  test('change bean name and save', async () => {
    const metadata = cloneDeep(mockModel.beans);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let changed: any;
    render(
      <MetadataEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={metadata}
        onChangeModel={(model) => {
          changed = model;
        }}
      />,
    );
    const row = screen.getByTestId('metadata-row-0');
    fireEvent.click(row);
    const nameInput = screen.getAllByRole('textbox').filter((input) => input.getAttribute('name') === '#.name')[0];
    fireEvent.input(nameInput, { target: { value: 'beanNameModified' } });
    expect(changed[0].name).toBe('beanNameModified');
  });

  test('delete a bean and save', async () => {
    const metadata = cloneDeep(mockModel.beans);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let changed: any;
    render(
      <MetadataEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={metadata}
        onChangeModel={(model) => {
          changed = model;
        }}
      />,
    );
    const deleteBtn = screen.getByTestId('metadata-delete-0-btn');
    fireEvent.click(deleteBtn);
    expect(changed.length).toBe(1);
    expect(changed[0].name).toBe('bean2');
  });

  /*
   * Bean Properties
   */

  test('add property and confirm', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beans: any[] = cloneDeep(mockModel.beansNoProp);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let changed: any;
    render(
      <MetadataEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={beans}
        onChangeModel={(model) => {
          changed = model;
        }}
      />,
    );
    const row = screen.getByTestId('metadata-row-0');
    fireEvent.click(row);

    const addPropBtn = screen.getByTestId('#.properties__add');
    fireEvent.click(addPropBtn);

    const propKeyInput = screen.getByPlaceholderText('Write a key');
    fireEvent.input(propKeyInput, { target: { value: 'propStr' } });
    const propValueInput = screen.getByPlaceholderText('Write a value');
    fireEvent.input(propValueInput, { target: { value: 'propStrVal' } });

    expect(changed[0].properties.propStr).toBe('propStrVal');
  });

  test('delete property and save', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beans: any[] = cloneDeep(mockModel.beans);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let changed: any;
    render(
      <MetadataEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={beans}
        onChangeModel={(model) => {
          changed = model;
        }}
      />,
    );
    const row = screen.getByTestId('metadata-row-0');
    fireEvent.click(row);

    const deleteBtn = screen.getByRole('button', { name: 'Remove the prop1 property' });
    fireEvent.click(deleteBtn);

    expect(changed[0].properties.prop1).toBeFalsy();
  });
});
