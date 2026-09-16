import { act, fireEvent, render, screen } from '@testing-library/react';
import { OneOfSchemas } from '../../utils/get-oneof-schema-list';
import { SchemaList } from './SchemaList';

describe('SchemaList', () => {
  const mockSchemas: OneOfSchemas[] = [
    {
      name: 'Schema 1',
      description: 'First schema',
      schema: { type: 'object', properties: { name: { type: 'string' } } },
    },
    {
      name: 'Schema 2',
      description: 'Second schema',
      schema: { type: 'object', properties: { value: { type: 'number' } } },
    },
  ];

  const manySchemas = [...mockSchemas];
  manySchemas.push(
    { name: 'Schema 3', description: 'Third schema', schema: { type: 'string' } },
    { name: 'Schema 4', description: 'Fourth schema', schema: { type: 'string' } },
    { name: 'Schema 5', description: 'Fifth schema', schema: { type: 'string' } },
    { name: 'Schema 6', description: 'Sixth schema', schema: { type: 'string' } },
  );

  const mockOnChange = jest.fn();
  const mockOnCleanInput = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with basic props when schema is selected', () => {
    const { container } = render(
      <SchemaList
        propName="testProp"
        selectedSchema={mockSchemas[0]}
        schemas={mockSchemas}
        onChange={mockOnChange}
        onCleanInput={mockOnCleanInput}
        placeholder="Select schema"
        aria-label="Test schema list"
        data-testid="test-schema-list"
      />,
    );

    expect(container).toMatchSnapshot();
  });

  it('should render correctly with basic props when no schema is selected', () => {
    const { container } = render(
      <SchemaList
        propName="testProp"
        selectedSchema={undefined}
        schemas={mockSchemas}
        onChange={mockOnChange}
        onCleanInput={mockOnCleanInput}
        placeholder="Select schema"
        aria-label="Test schema list"
        data-testid="test-schema-list"
      />,
    );

    expect(container).toMatchSnapshot();
  });

  it('should use Typeahead when items > 5, none selected', () => {
    const { container } = render(
      <SchemaList
        propName="testProp"
        selectedSchema={undefined}
        schemas={manySchemas}
        onChange={mockOnChange}
        data-testid="test-schema-list"
      />,
    );

    expect(container).toMatchSnapshot();
  });

  it('should use Typeahead when items > 5, one selected', () => {
    const { container } = render(
      <SchemaList
        propName="testProp"
        selectedSchema={manySchemas[4]}
        schemas={manySchemas}
        onChange={mockOnChange}
        onCleanInput={mockOnCleanInput}
        data-testid="test-schema-list"
      />,
    );

    expect(container).toMatchSnapshot();

    // clear the selection
    const clearButton = container.querySelector('button[title="Clear selected item"]');
    if (clearButton) {
      fireEvent.click(clearButton);
      expect(mockOnCleanInput).toHaveBeenCalled();
    } else {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    }
  });

  it('should handle schema selection and change', async () => {
    render(
      <SchemaList
        propName="testProp"
        selectedSchema={manySchemas[0]}
        schemas={manySchemas}
        onChange={mockOnChange}
        aria-label="Test schema list"
        data-testid="test-schema-list"
      />,
    );

    act(() => {
      const toggle = screen.getByLabelText('Open');
      fireEvent.click(toggle);
    });

    act(() => {
      const option = screen.getByText('Schema 2');
      fireEvent.click(option);
    });

    expect(mockOnChange).toHaveBeenCalled();
  });
});
