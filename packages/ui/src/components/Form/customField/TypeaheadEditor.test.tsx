import { SelectOptionProps } from '@patternfly/react-core';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { TypeaheadEditor } from './TypeaheadEditor';

describe('TypeaheadField', () => {
  const initialDataFormatOptions: SelectOptionProps[] = [
    {
      value: 'asn1',
      children: 'ASN.1 File',
      description: 'Encode and decode data structures using Abstract Syntax Notation One (ASN.1).',
    },
    {
      value: 'avro',
      children: 'Avro',
      description: 'Serialize and deserialize messages using Apache Avro binary data format.',
    },
    {
      value: 'barcode',
      children: 'Barcode',
      description: 'Transform strings to various 1D/2D barcode bitmap formats and back.',
    },
    { value: 'base64', children: 'Base64', description: 'Encode and decode data using Base64.' },
  ];

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render the component', () => {
    render(
      <TypeaheadEditor
        selectOptions={initialDataFormatOptions}
        title="Test"
        selected={undefined}
        selectedModel={undefined}
        selectedSchema={undefined}
        selectionOnChange={mockOnChange}
      />,
    );
    const inputElement = screen.getByRole('combobox');
    expect(inputElement).toBeInTheDocument();
  });

  it('should display the options when the input is clicked', async () => {
    render(
      <TypeaheadEditor
        selectOptions={initialDataFormatOptions}
        title="Test"
        selected={undefined}
        selectedModel={undefined}
        selectedSchema={undefined}
        selectionOnChange={mockOnChange}
      />,
    );
    const inputElement = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.click(inputElement);
    });
    const optionElements = screen.getAllByRole('option');
    expect(optionElements).toHaveLength(4);
  });

  it('should select an option when clicked', async () => {
    render(
      <TypeaheadEditor
        selectOptions={initialDataFormatOptions}
        title="Test"
        selected={undefined}
        selectedModel={undefined}
        selectedSchema={undefined}
        selectionOnChange={mockOnChange}
      />,
    );
    const inputElement = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.click(inputElement);
    });
    const optionElement = screen.getByText('Avro');
    await act(() => {
      fireEvent.click(optionElement);
    });
    expect(mockOnChange).toHaveBeenCalledWith({ name: 'avro', title: 'Avro' }, {});
  });

  it('should clear the input value when the clear button is clicked', async () => {
    const selected = { name: 'avro', title: 'Avro' };
    const selectedModel = {};
    const selectedSchema = {};
    render(
      <TypeaheadEditor
        selectOptions={initialDataFormatOptions}
        title="Test"
        selected={selected}
        selectedModel={selectedModel}
        selectedSchema={selectedSchema}
        selectionOnChange={mockOnChange}
      />,
    );
    const inputElement = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(inputElement, { target: { value: 'customValue' } });
    });
    const clearButton = screen.getByLabelText('Clear input value');
    await act(async () => {
      fireEvent.click(clearButton);
    });
    expect(inputElement).toHaveValue('');
    expect(mockOnChange).toHaveBeenCalledWith(undefined, {});
  });
});
