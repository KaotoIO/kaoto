import { MetadataEditor } from './MetadataEditor';
import { mockModel, mockSchema } from './TestUtil';
import { fireEvent, render, screen } from '@testing-library/react';
import { cloneDeep } from 'lodash';

describe('MetadataEditor.tsx', () => {
  test('component renders', () => {
    render(<MetadataEditor name="beans" schema={mockSchema.beans} metadata={[]} onChangeModel={() => {}} />);
    const element = screen.queryByTestId('metadata-editor-form-beans');
    expect(element).toBeInTheDocument();
  });

  test('Details disabled if empty', async () => {
    render(<MetadataEditor name="beans" schema={mockSchema.beans} metadata={[]} onChangeModel={() => {}} />);
    const inputs = screen.getAllByTestId('text-field').filter((input) => input.getAttribute('name') === 'name');
    expect(inputs.length).toBe(1);
    expect(inputs[0]).toBeDisabled();
    const addStringPropBtn = screen.getByTestId('properties-add-string-property--btn');
    expect(addStringPropBtn).toBeDisabled();
    const addObjectPropBtn = screen.getByTestId('properties-add-object-property--btn');
    expect(addObjectPropBtn).toBeDisabled();
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
    const inputs = screen.getAllByTestId('text-field').filter((input) => input.getAttribute('name') === 'name');
    expect(inputs.length).toBe(1);
    expect(inputs[0]).toBeEnabled();
    const addStringPropBtn = screen.getByTestId('properties-add-string-property--btn');
    expect(addStringPropBtn).toBeEnabled();
    const addObjectPropBtn = screen.getByTestId('properties-add-object-property--btn');
    expect(addObjectPropBtn).toBeEnabled();
  });

  test('render properties empty state', async () => {
    render(
      <MetadataEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={cloneDeep(mockModel.beansNoProp)}
        onChangeModel={() => {}}
      />,
    );
    const row = screen.getByTestId('metadata-row-0');
    fireEvent.click(row);
    let addStringPropBtns = screen.getAllByTestId('properties-add-string-property--btn');
    expect(addStringPropBtns.length).toBe(2);
    fireEvent.click(addStringPropBtns[1]);
    addStringPropBtns = screen.getAllByTestId('properties-add-string-property--btn');
    expect(addStringPropBtns.length).toBe(1);
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
    const beanNameInput = screen
      .getAllByLabelText('uniforms text field')
      .filter((input) => input.getAttribute('name') === 'name')[0];
    fireEvent.input(beanNameInput, { target: { value: 'bean1' } });
    const beanTypeInput = screen
      .getAllByLabelText('uniforms text field')
      .filter((input) => input.getAttribute('name') === 'type')[0];
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
    const nameInput = screen
      .getAllByLabelText('uniforms text field')
      .filter((input) => input.getAttribute('name') === 'name')[0];
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

  test('add string property and confirm', async () => {
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

    const addStringPropBtn = screen.getAllByTestId('properties-add-string-property--btn')[0];
    fireEvent.click(addStringPropBtn);
    const propNameInput = screen.getByTestId('properties--placeholder-name-input');
    fireEvent.input(propNameInput, { target: { value: 'propStr' } });
    const propValueInput = screen.getByTestId('properties--placeholder-value-input');
    fireEvent.input(propValueInput, { target: { value: 'propStrVal' } });
    const confirmBtn = screen.getByTestId('properties--placeholder-property-edit-confirm--btn');
    fireEvent.click(confirmBtn);

    expect(changed[0].properties.propStr).toBe('propStrVal');
  });

  test('add object property and confirm', async () => {
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

    const addObjectPropBtn = screen.getAllByTestId('properties-add-object-property--btn')[0];
    fireEvent.click(addObjectPropBtn);
    const nameInput = screen.getByTestId('properties--placeholder-name-input');
    fireEvent.input(nameInput, { target: { value: 'propObj' } });
    const confirmBtn = screen.getByTestId('properties--placeholder-property-edit-confirm--btn');
    fireEvent.click(confirmBtn);

    expect(changed[0].properties.propObj).toBeTruthy();
  });

  test('add string property and cancel', async () => {
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

    const addStringPropBtn = screen.getAllByTestId('properties-add-string-property--btn')[0];
    fireEvent.click(addStringPropBtn);
    const propNameInput = screen.getByTestId('properties--placeholder-name-input');
    fireEvent.input(propNameInput, { target: { value: 'propStr' } });
    const propValueInput = screen.getByTestId('properties--placeholder-value-input');
    fireEvent.input(propValueInput, { target: { value: 'propStrVal' } });
    const cancelBtn = screen.getByTestId('properties--placeholder-property-edit-cancel--btn');
    fireEvent.click(cancelBtn);

    expect(changed[0].properties.propStr).toBeFalsy();
  });

  test('add object property and cancel', async () => {
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

    const addObjectPropBtn = screen.getAllByTestId('properties-add-object-property--btn')[0];
    fireEvent.click(addObjectPropBtn);
    const nameInput = screen.getByTestId('properties--placeholder-name-input');
    fireEvent.input(nameInput, { target: { value: 'propObj' } });
    const objCancelBtn = screen.getByTestId('properties--placeholder-property-edit-cancel--btn');
    fireEvent.click(objCancelBtn);

    expect(changed[0].properties.propObj).toBeFalsy();
  });

  test('change string property and confirm', async () => {
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

    const strEditBtn = screen.getByTestId('properties-prop1-property-edit-prop1-btn');
    fireEvent.click(strEditBtn);
    const propNameInput = screen.getByTestId('properties-prop1-name-input');
    fireEvent.input(propNameInput, { target: { value: 'prop1Modified' } });
    const propValueInput = screen.getByTestId('properties-prop1-value-input');
    fireEvent.input(propValueInput, { target: { value: 'prop1ValModified' } });
    const confirmBtn = screen.getByTestId('properties-prop1-property-edit-confirm-prop1-btn');
    fireEvent.click(confirmBtn);

    expect(changed[0].properties.prop1Modified).toBe('prop1ValModified');
  });

  test('change object property and confirm', async () => {
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

    const objEditBtn = screen.getByTestId('properties-propObj1-property-edit-propObj1-btn');
    fireEvent.click(objEditBtn);
    const objPropNameInput = screen.getByTestId('properties-propObj1-name-input');
    fireEvent.input(objPropNameInput, { target: { value: 'propObj1Modified' } });
    const objConfirmBtn = screen.getByTestId('properties-propObj1-property-edit-confirm-propObj1-btn');
    fireEvent.click(objConfirmBtn);

    expect(changed[0].properties.propObj1Modified.propObj1Sub).toBe('valueObj1');
  });

  test('change string property and cancel', async () => {
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

    const strEditBtn = screen.getByTestId('properties-prop1-property-edit-prop1-btn');
    fireEvent.click(strEditBtn);
    const propNameInput = screen.getByTestId('properties-prop1-name-input');
    fireEvent.input(propNameInput, { target: { value: 'prop1Modified' } });
    const propValueInput = screen.getByTestId('properties-prop1-value-input');
    fireEvent.input(propValueInput, { target: { value: 'prop1ValModified' } });
    const cancelBtn = screen.getByTestId('properties-prop1-property-edit-cancel-prop1-btn');
    fireEvent.click(cancelBtn);

    expect(changed).toBeFalsy();
  });

  test('change object property and cancel', async () => {
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

    const objEditBtn = screen.getByTestId('properties-propObj1-property-edit-propObj1-btn');
    fireEvent.click(objEditBtn);
    const objPropNameInput = screen.getByTestId('properties-propObj1-name-input');
    fireEvent.input(objPropNameInput, { target: { value: 'propObj1Modified' } });
    const objCancelBtn = screen.getByTestId('properties-propObj1-property-edit-cancel-propObj1-btn');
    fireEvent.click(objCancelBtn);

    expect(changed).toBeFalsy();
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
    const expandBtn = screen.getByLabelText('Expand row 1');
    fireEvent.click(expandBtn);
    const deleteBtn = screen.getByTestId('properties-propObj1-propObj1Sub-delete-propObj1Sub-btn');
    fireEvent.click(deleteBtn);
    expect(changed[0].properties.propObj1.propObj1Sub).toBeFalsy();
  });
});
