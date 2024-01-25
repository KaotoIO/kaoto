import { AutoField } from '@kaoto-next/uniforms-patternfly';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { AutoForm } from 'uniforms';
import { SchemaService } from '..';
import { CustomAutoFieldDetector } from '../CustomAutoField';
import { TypeaheadField } from './TypeaheadField';

describe('TypeaheadField', () => {
  const mockSchema = {
    title: 'Threads',
    description: 'Specifies that all steps after this node are processed asynchronously',
    type: 'object',
    additionalProperties: false,
    properties: {
      rejectedPolicy: {
        type: 'string',
        title: 'Rejected Policy',
        description: 'Sets the handler for tasks which cannot be executed by the thread pool.',
        enum: ['option1', 'option2', 'option3'],
      },
    },
  };
  const mockOnChange = jest.fn();
  const schemaService = new SchemaService();
  const schemaBridge = schemaService.getSchemaBridge(mockSchema);

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render the component', () => {
    render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!}>
          <TypeaheadField name="rejectedPolicy" />
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>,
    );
    const inputElement = screen.getByRole('combobox');
    expect(inputElement).toBeInTheDocument();
  });

  it('should display the options when the input is clicked', () => {
    render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!}>
          <TypeaheadField name="rejectedPolicy" />
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>,
    );
    const inputElement = screen.getByRole('combobox');
    fireEvent.click(inputElement);
    const optionElements = screen.getAllByRole('option');
    expect(optionElements).toHaveLength(3);
  });

  it('should select an option when clicked', () => {
    render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!}>
          <TypeaheadField name="rejectedPolicy" onChange={mockOnChange} />
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>,
    );
    const inputElement = screen.getByRole('combobox');
    fireEvent.click(inputElement);
    const optionElement = screen.getByText('option1');
    act(() => {
      fireEvent.click(optionElement);
    });
    expect(mockOnChange).toHaveBeenCalledWith('option1');
  });

  it('should create a new option when a custom value is entered', () => {
    const wrapper = render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!}>
          <TypeaheadField name="rejectedPolicy" onChange={mockOnChange} />
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>,
    );
    const inputElement = wrapper.getByRole('combobox');
    act(() => {
      fireEvent.change(inputElement, { target: { value: 'customValue' } });
      fireEvent.keyDown(inputElement, { key: 'Enter' });
    });
    expect(inputElement).toHaveValue('customValue');
  });

  it('should clear the input value when the clear button is clicked', () => {
    render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!}>
          <TypeaheadField name="rejectedPolicy" onChange={mockOnChange} />
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>,
    );
    const inputElement = screen.getByRole('combobox');
    act(() => {
      fireEvent.change(inputElement, { target: { value: 'customValue' } });
    });
    const clearButton = screen.getByLabelText('Clear input value');
    act(() => {
      fireEvent.click(clearButton);
    });
    expect(inputElement).toHaveValue('');
  });
});
