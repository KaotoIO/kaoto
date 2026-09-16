import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasFormTabsContextResult } from '../../providers';
import { FormComponentFactoryProvider } from '../../providers/FormComponentFactoryProvider';
import { SchemaProvider } from '../../providers/SchemaProvider';
import { OneOfSchemas, ROOT_PATH } from '../../utils';
import { OneOfField } from './OneOfField';

// Mock the useOneOfField hook
jest.mock('../../hooks/one-of-field', () => ({
  useOneOfField: jest.fn(),
}));

import { useOneOfField } from '../../hooks/one-of-field';

const mockUseOneOfField = useOneOfField as jest.MockedFunction<typeof useOneOfField>;

describe('OneOfField', () => {
  beforeEach(() => {
    // Reset mock
    jest.clearAllMocks();
  });

  const mockOneOfSchemas = [
    {
      name: 'Test Schema 1',
      description: 'First test schema',
      schema: { type: 'object', properties: { name: { type: 'string' } } },
    },
    {
      name: 'Test Schema 2',
      description: 'Second test schema',
      schema: { type: 'object', properties: { value: { type: 'number' } } },
    },
  ] as OneOfSchemas[];

  const defaultMockReturn = {
    selectedOneOfSchema: mockOneOfSchemas[0],
    oneOfSchemas: mockOneOfSchemas,
    onSchemaChange: jest.fn(),
    shouldRender: true,
  };

  const schema = {
    oneOf: mockOneOfSchemas,
  };

  it('should render correctly with basic oneOf schema', () => {
    mockUseOneOfField.mockReturnValue(defaultMockReturn);

    const { container } = render(
      <FormComponentFactoryProvider>
        <SchemaProvider schema={schema}>
          <OneOfField propName={ROOT_PATH} />
        </SchemaProvider>
      </FormComponentFactoryProvider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should render with different format types and set appropriate titles', () => {
    const testCases = [
      { format: 'dataFormatType', expectedTitle: 'Data Format Type' },
      { format: 'loadBalancerType', expectedTitle: 'Load Balancer Type' },
      { format: 'expression', expectedTitle: 'Expression' },
      { format: 'errorHandlerType', expectedTitle: 'Error Handler Type' },
    ];

    testCases.forEach(({ format, expectedTitle }) => {
      // Mock with no selectedOneOfSchema to test the format-based title logic
      mockUseOneOfField.mockReturnValue({
        ...defaultMockReturn,
        selectedOneOfSchema: undefined,
      });

      schema['format'] = format;

      const wrapper = render(
        <FormComponentFactoryProvider>
          <SchemaProvider schema={schema}>
            <OneOfField propName={ROOT_PATH} />
          </SchemaProvider>
        </FormComponentFactoryProvider>,
      );

      expect(wrapper?.getByText(expectedTitle)).toBeInTheDocument();
    });
  });

  it('should not render when shouldRender is false', () => {
    mockUseOneOfField.mockReturnValue({
      ...defaultMockReturn,
      shouldRender: false,
    });

    const { container } = render(
      <FormComponentFactoryProvider>
        <SchemaProvider schema={schema}>
          <OneOfField propName={ROOT_PATH} />
        </SchemaProvider>
      </FormComponentFactoryProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should handle schema selection and change functionality', () => {
    const mockOnSchemaChange = jest.fn();
    mockUseOneOfField.mockReturnValue({
      ...defaultMockReturn,
      onSchemaChange: mockOnSchemaChange,
    });

    render(
      <FormComponentFactoryProvider>
        <SchemaProvider schema={schema}>
          <OneOfField propName={ROOT_PATH} />
        </SchemaProvider>
      </FormComponentFactoryProvider>,
    );

    // Test schema change
    const schemaTab = screen.getByRole('tab', { name: 'Test Schema 2' });
    fireEvent.click(schemaTab);
    expect(mockOnSchemaChange).toHaveBeenCalledWith(mockOneOfSchemas[1]);
  });
});
