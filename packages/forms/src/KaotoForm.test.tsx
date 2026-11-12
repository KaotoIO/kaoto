import { act, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';

import { KaotoForm, KaotoFormApi, KaotoFormProps } from './KaotoForm';
import { CanvasFormTabsContext } from './providers/canvas-form-tabs.provider';
import { FilteredFieldContext } from './providers/filtered-field.provider';
import { KaotoFormPageObject } from './testing/KaotoFormPageObject';

describe('KaotoForm', () => {
  const defaultProps: KaotoFormProps = {
    schema: {
      type: 'object',
      properties: {
        name: { title: 'Name', type: 'string' },
      },
      required: ['name'],
    },
    model: {},
    'data-testid': 'kaoto-form',
  };

  it('renders without crashing', () => {
    render(<KaotoForm {...defaultProps} />);
    expect(screen.getByTestId('kaoto-form')).toBeInTheDocument();
  });

  it('should prevent executing the default onSubmit action', () => {
    const { getByTestId } = render(<KaotoForm {...defaultProps} />);
    const form = getByTestId('kaoto-form');

    const mockEvent = createEvent.submit(form);
    const preventDefaultSpy = vi.spyOn(mockEvent, 'preventDefault');

    act(() => {
      fireEvent(form, mockEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('displays "Schema not defined" when schema is not provided', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error logs

    expect(() => render(<KaotoForm {...defaultProps} schema={undefined} />)).toThrow('[KaotoForm]: Schema is required');

    vi.restoreAllMocks();
  });

  it('should not call onChange when loading the form for the first time', () => {
    const onChangeMock = vi.fn();
    render(<KaotoForm {...defaultProps} onChange={onChangeMock} />);
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it('should call onChange when the model changes', async () => {
    const onChangeMock = vi.fn();
    render(<KaotoForm {...defaultProps} onChange={onChangeMock} />);

    const value = 'new value';

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.inputText('Name', value);

    expect(onChangeMock).toHaveBeenCalledWith({
      name: value,
    });
  });

  it('should call onChangeProp when a property changes', async () => {
    const onChangePropMock = vi.fn();
    render(<KaotoForm {...defaultProps} onChangeProp={onChangePropMock} />);

    const propName = 'name';
    const value = 'new value';

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.inputText('Name', value);

    expect(onChangePropMock).toHaveBeenCalledWith(propName, value);
  });

  it('should call onChangeProp when a primitive property changes', async () => {
    const onChangePropMock = vi.fn();
    render(<KaotoForm {...defaultProps} model="" onChangeProp={onChangePropMock} />);

    const value = 'new value';

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.inputText('Name', value);

    expect(onChangePropMock).toHaveBeenCalledWith('name', value);
  });

  it('should validate the model', async () => {
    const wrapper = render(<KaotoFormApiTest />);

    const validateButton = wrapper.getByTestId('validate');
    fireEvent.click(validateButton);

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  describe('toolbar options', () => {
    const toolbarSchema: KaotoFormProps['schema'] = {
      type: 'object',
      properties: {
        name: { title: 'Name', type: 'string' },
        description: { title: 'Description', type: 'string' },
      },
      required: ['name'],
    };
    const renderForm = (props: Partial<KaotoFormProps> = {}) =>
      render(<KaotoForm schema={toolbarSchema} model={{}} {...props} />);

    it('renders no toolbar and shows every field by default', () => {
      renderForm();

      expect(screen.queryByTestId('kaoto-form-toolbar')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Description' })).toBeInTheDocument();
    });

    it('applies defaultSectionTab even when the section tabs are hidden', () => {
      renderForm({ defaultSectionTab: 'Required' });

      expect(screen.queryByTestId('kaoto-form-toolbar')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'Description' })).not.toBeInTheDocument();
    });

    it('renders the section tabs and switches between them', async () => {
      renderForm({ showSectionTabs: true, defaultSectionTab: 'Required' });
      const formPageObject = new KaotoFormPageObject(screen, act);

      expect(screen.getByTestId('tab-Required')).toHaveAttribute('aria-selected', 'true');
      expect(screen.queryByRole('textbox', { name: 'Description' })).not.toBeInTheDocument();

      await formPageObject.showAllFields();
      expect(screen.getByRole('textbox', { name: 'Description' })).toBeInTheDocument();

      await formPageObject.showModifiedFields();
      expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    });

    it('does not render the filter field unless requested', () => {
      renderForm({ showSectionTabs: true });

      expect(screen.queryByTestId('filter-fields')).not.toBeInTheDocument();
    });

    it('filters the fields by name', async () => {
      renderForm({ showFilterField: true });
      const formPageObject = new KaotoFormPageObject(screen, act);

      expect(screen.queryByTestId('tab-All')).not.toBeInTheDocument();

      await formPageObject.filterFields('desc');

      await waitFor(() => {
        expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
      });
      expect(screen.getByRole('textbox', { name: 'Description' })).toBeInTheDocument();
    });

    it('ignores the tab and filter providers rendered above the form', () => {
      render(
        <CanvasFormTabsContext.Provider
          value={{ selectedTab: 'Required', setSelectedTab: vi.fn(), showSectionTabs: true }}
        >
          <FilteredFieldContext.Provider
            value={{ filteredFieldText: 'zzz', onFilterChange: vi.fn(), isGroupExpanded: true }}
          >
            <KaotoForm schema={toolbarSchema} model={{}} />
          </FilteredFieldContext.Provider>
        </CanvasFormTabsContext.Provider>,
      );

      expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Description' })).toBeInTheDocument();
    });

    it('renders the children between the toolbar and the fields', () => {
      renderForm({
        showFilterField: true,
        children: <div data-testid="form-children">extra content</div>,
      });

      const toolbar = screen.getByTestId('kaoto-form-toolbar');
      const children = screen.getByTestId('form-children');
      const field = screen.getByRole('textbox', { name: 'Name' });

      expect(toolbar.compareDocumentPosition(children) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(children.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('offers the switch to the All tab only when the section tabs are shown', () => {
      const { unmount } = renderForm({ showSectionTabs: true, defaultSectionTab: 'Modified' });
      expect(screen.getByRole('button', { name: 'Switch to All tab' })).toBeInTheDocument();
      unmount();

      renderForm({ defaultSectionTab: 'Modified' });
      expect(screen.getByText('No Modified fields found')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Switch to All tab' })).not.toBeInTheDocument();
    });
  });

  const KaotoFormApiTest = () => {
    const formRef = useRef<KaotoFormApi>(null);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    return (
      <>
        <code>{JSON.stringify(errors, undefined, 2)}</code>
        <KaotoForm {...defaultProps} ref={formRef} />
        <button
          type="button"
          title="validate"
          data-testid="validate"
          onClick={() => {
            const errors = formRef.current?.validate();
            setErrors(errors ?? {});
          }}
        />
      </>
    );
  };
});
