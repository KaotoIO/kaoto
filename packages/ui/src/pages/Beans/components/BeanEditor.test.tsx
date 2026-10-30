import { SuggestionRegistryProvider } from '@kaoto/forms';
import { KaotoFormPageObject } from '@kaoto/forms/testing';
import { act, fireEvent, render as rtlRender, screen, within } from '@testing-library/react';
import { cloneDeep } from 'lodash';
import { ReactElement } from 'react';

import { BeanEditor } from './BeanEditor';

const mockSchema = {
  beans: {
    title: 'Beans',
    description: 'Beans Configuration',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string', description: 'Bean name' },
        type: {
          type: 'string',
          description: 'What type to use for creating the bean.',
        },
        properties: {
          type: 'object',
          description: 'Optional properties to set on the created local bean',
        },
      },
      required: ['name', 'type'],
    },
  },
};

const mockModel = {
  beans: [
    { name: 'bean1', type: 'type1', properties: { prop1: 'value1' } },
    { name: 'bean2', type: 'type2', properties: { prop2: 'value2' } },
  ],
};

const render = (ui: ReactElement) => rtlRender(<SuggestionRegistryProvider>{ui}</SuggestionRegistryProvider>);

const formPageObject = () => new KaotoFormPageObject(screen, act);

/** The details form is the last form in the DOM: the add modal stays mounted (closed) after its first use */
const getDetailsNameInput = () => {
  const inputs = screen.getAllByRole('textbox').filter((input) => input.getAttribute('name') === '#.name');
  return inputs[inputs.length - 1];
};

function openAddModal() {
  fireEvent.click(screen.getByText('Actions'));
  fireEvent.click(screen.getByTestId('metadata-add-beans-btn'));
}

async function addBeanViaModal(name: string, type: string) {
  openAddModal();
  const form = formPageObject();
  await form.inputText('Name', name);
  await form.inputText('Type', type);
  fireEvent.click(screen.getByTestId('bean-add-modal-add-btn'));
  // The added bean gets selected, which renders the details form
  await screen.findByTestId('bean-editor-title');
}

describe('BeanEditor.tsx', () => {
  test('component renders', () => {
    const { container } = render(
      <BeanEditor name="beans" schema={mockSchema.beans} metadata={[]} onChangeModel={() => {}} />,
    );
    expect(screen.queryByTestId('bean-editor-title')).not.toBeInTheDocument();
    // Structural assertion: resizable layout renders both panels
    expect(container.querySelector('.resizable-split-panels')).toBeTruthy();
    expect(container.querySelector('.metadata-editor-modal-list-view')).toBeTruthy();
    expect(container.querySelector('.metadata-editor-modal-details-view')).toBeTruthy();
  });

  test('shows a placeholder instead of the form when no bean is selected', () => {
    render(
      <BeanEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={cloneDeep(mockModel.beans)}
        onChangeModel={() => {}}
      />,
    );
    expect(screen.getByTestId('metadata-editor-empty-details')).toHaveTextContent(
      'Select a bean from the list to edit its details',
    );
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryByTestId('bean-editor-title')).not.toBeInTheDocument();
  });

  test('shows the form and hides the placeholder after selecting a row', async () => {
    render(
      <BeanEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={cloneDeep(mockModel.beans)}
        onChangeModel={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('metadata-row-0'));
    const inputs = screen.getAllByRole('textbox').filter((input) => input.getAttribute('name') === '#.name');
    expect(inputs[0]).toBeEnabled();
    expect(screen.queryByTestId('metadata-editor-empty-details')).not.toBeInTheDocument();
    expect(screen.getByTestId('bean-editor-title')).toHaveTextContent('Edit bean1');
  });

  test('Add opens a modal; confirming adds the bean with the typed name and type and selects it', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let changed: any;
    render(
      <BeanEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={[]}
        onChangeModel={(model) => {
          changed = model;
        }}
      />,
    );
    await addBeanViaModal('myBean', 'org.acme.MyBean');
    expect(changed).toEqual([{ name: 'myBean', type: 'org.acme.MyBean' }]);
    expect(screen.getByTestId('metadata-row-0')).toHaveTextContent('myBean');
    expect(screen.getByTestId('metadata-row-0')).toHaveTextContent('org.acme.MyBean');
    expect(screen.getByTestId('metadata-row-0')).toHaveClass('cds--tree-node--active');
    expect(screen.getByTestId('bean-editor-title')).toHaveTextContent('Edit myBean');
  });

  test('Add does not change the model until the modal is confirmed', () => {
    const onChangeModel = vi.fn();
    render(<BeanEditor name="beans" schema={mockSchema.beans} metadata={[]} onChangeModel={onChangeModel} />);
    openAddModal();
    expect(onChangeModel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('bean-add-modal-cancel-btn'));
    expect(onChangeModel).not.toHaveBeenCalled();
    expect(screen.queryByTestId('metadata-row-0')).not.toBeInTheDocument();
  });

  test('the modal requires both a name and a type', async () => {
    const onChangeModel = vi.fn();
    render(<BeanEditor name="beans" schema={mockSchema.beans} metadata={[]} onChangeModel={onChangeModel} />);
    openAddModal();
    await formPageObject().inputText('Name', 'onlyName');
    fireEvent.click(screen.getByTestId('bean-add-modal-add-btn'));
    expect(onChangeModel).not.toHaveBeenCalled();
  });

  describe('when the catalog does not require the type', () => {
    const optionalTypeSchema = { ...mockSchema.beans, items: { ...mockSchema.beans.items, required: ['name'] } };

    test('the modal still asks for the type but does not require it', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let changed: any;
      render(
        <BeanEditor
          name="beans"
          schema={optionalTypeSchema}
          metadata={[]}
          onChangeModel={(model) => {
            changed = model;
          }}
        />,
      );
      openAddModal();
      const modal = within(screen.getByTestId('bean-add-modal'));
      expect(modal.getByRole('textbox', { name: 'Type' })).toBeInTheDocument();

      await formPageObject().inputText('Name', 'onlyName');
      fireEvent.click(screen.getByTestId('bean-add-modal-add-btn'));
      await screen.findByTestId('bean-editor-title');
      expect(changed).toEqual([{ name: 'onlyName' }]);
    });

    test('the type typed in the modal is added to the bean', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let changed: any;
      render(
        <BeanEditor
          name="beans"
          schema={optionalTypeSchema}
          metadata={[]}
          onChangeModel={(model) => {
            changed = model;
          }}
        />,
      );
      await addBeanViaModal('myBean', 'org.acme.MyBean');
      expect(changed).toEqual([{ name: 'myBean', type: 'org.acme.MyBean' }]);
    });
  });

  test('the modal opens empty each time', async () => {
    render(<BeanEditor name="beans" schema={mockSchema.beans} metadata={[]} onChangeModel={() => {}} />);
    await addBeanViaModal('first', 'type1');
    openAddModal();
    const modal = within(screen.getByTestId('bean-add-modal'));
    expect(modal.getByRole('textbox', { name: 'Name' })).toHaveValue('');
    expect(modal.getByRole('textbox', { name: 'Type' })).toHaveValue('');
  });

  test('Change bean name and save', async () => {
    const metadata = cloneDeep(mockModel.beans);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let changed: any;
    render(
      <BeanEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={metadata}
        onChangeModel={(model) => {
          changed = model;
        }}
      />,
    );
    fireEvent.click(screen.getByTestId('metadata-row-0'));
    const nameInput = getDetailsNameInput();
    fireEvent.input(nameInput, { target: { value: 'beanNameModified' } });
    expect(changed[0].name).toBe('beanNameModified');
  });

  test('Delete a bean from the right-click menu', async () => {
    const metadata = cloneDeep(mockModel.beans);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let changed: any;
    render(
      <BeanEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={metadata}
        onChangeModel={(model) => {
          changed = model;
        }}
      />,
    );
    fireEvent.contextMenu(screen.getByText('bean2'));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Delete/ }));
    expect(changed).toHaveLength(1);
    expect(changed[0].name).toBe('bean1');
  });

  // preparedModel path: second operation after a first exercises the preparedModel branch
  test('add then edit exercises preparedModel path', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let changed: any;
    render(
      <BeanEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={[]}
        onChangeModel={(model) => {
          changed = model;
        }}
      />,
    );
    // Add first bean
    await addBeanViaModal('firstBean', 'type1');
    const nameInput = getDetailsNameInput();
    fireEvent.input(nameInput, { target: { value: 'firstBeanEdited' } });
    expect(changed[0].name).toBe('firstBeanEdited');

    // Edit the same bean again — exercises preparedModel !== null branch
    fireEvent.input(nameInput, { target: { value: 'renamedBean' } });
    expect(changed[0].name).toBe('renamedBean');
    // Model should still have exactly 1 item
    expect(changed).toHaveLength(1);
  });

  test('delete then edit remaining bean exercises preparedModel path', async () => {
    const metadata = cloneDeep(mockModel.beans);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let changed: any;
    render(
      <BeanEditor
        name="beans"
        schema={mockSchema.beans}
        metadata={metadata}
        onChangeModel={(model) => {
          changed = model;
        }}
      />,
    );
    // Delete first bean
    fireEvent.click(screen.getByTestId('metadata-row-0'));
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByTestId('metadata-delete-0-btn'));
    expect(changed).toHaveLength(1);
    expect(changed[0].name).toBe('bean2');

    // Select the remaining bean and edit it — preparedModel is now set
    fireEvent.click(screen.getByTestId('metadata-row-0'));
    const nameInput = getDetailsNameInput();
    fireEvent.input(nameInput, { target: { value: 'renamedBean2' } });
    expect(changed[0].name).toBe('renamedBean2');
    expect(changed).toHaveLength(1);
  });
});

// NOTE: Tests that rely on real KaotoForm internals (add/delete property via '#.properties__add',
// 'Remove the prop1 property', 'Write a key' placeholders) are NOT ported here. Those test
// @kaoto/forms component behaviour (KaotoForm's own UI elements), not BeanEditor-owned behaviour.
// They belong in @kaoto/forms Cypress/Storybook tests.
