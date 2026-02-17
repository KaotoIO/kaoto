import { SchemaContext } from '@kaoto/forms';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { CustomTableToggle } from './CustomTableToggle';

const mockOnChange = jest.fn();
const mockUseFieldValue = jest.fn();

jest.mock('@kaoto/forms', () => ({
  ...jest.requireActual('@kaoto/forms'),
  ObjectField: ({ propName, required }: { propName: string; required?: boolean }) => (
    <div data-testid={`object-field-${propName}`} data-required={required}>
      ObjectField: {propName}
    </div>
  ),
  PropertiesField: ({ propName, required }: { propName: string; required?: boolean }) => (
    <div data-testid={`properties-field-${propName}`} data-required={required}>
      PropertiesField: {propName}
    </div>
  ),
  ArrayFieldWrapper: ({
    children,
    title,
    actions,
  }: {
    children: React.ReactNode;
    title: string;
    actions?: React.ReactNode;
  }) => (
    <div data-testid="array-field-wrapper">
      <div data-testid="array-field-title">{title}</div>
      <div data-testid="array-field-actions">{actions}</div>
      {children}
    </div>
  ),
  useFieldValue: (propName: string) => mockUseFieldValue(propName),
}));

describe('CustomTableToggle', () => {
  const schemaWithProperties = {
    schema: {
      properties: {
        prop1: { type: 'string' as const },
        prop2: { type: 'number' as const },
      },
    },
    definitions: {},
  };

  const schemaWithoutProperties = {
    schema: { properties: {} },
    definitions: {},
  };

  const defaultProps = {
    propName: 'testProp',
    required: false,
  };

  beforeEach(() => {
    mockOnChange.mockClear();
    mockUseFieldValue.mockReturnValue({
      value: { key1: 'value1', key2: 'value2' },
      onChange: mockOnChange,
    });
  });

  describe('when schema has properties', () => {
    it('should render toggle buttons with standard view by default', () => {
      render(
        <SchemaContext.Provider value={schemaWithProperties}>
          <CustomTableToggle {...defaultProps} />
        </SchemaContext.Provider>,
      );

      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();
      expect(screen.getByTestId('object-field-testProp')).toBeInTheDocument();
      expect(screen.queryByTestId('array-field-wrapper')).not.toBeInTheDocument();

      const standardButton = screen.getByTestId('testProp-standard-toggle').querySelector('button');
      expect(standardButton).toHaveClass('pf-m-selected');
    });

    it('should switch to custom view and back', async () => {
      const user = userEvent.setup();

      render(
        <SchemaContext.Provider value={schemaWithProperties}>
          <CustomTableToggle {...defaultProps} />
        </SchemaContext.Provider>,
      );

      // Switch to custom view
      await user.click(screen.getByText('Custom'));
      expect(screen.getByTestId('array-field-wrapper')).toBeInTheDocument();
      expect(screen.getByTestId('array-field-title')).toHaveTextContent('Endpoint Properties');
      expect(screen.getByTestId('properties-field-testProp')).toBeInTheDocument();
      expect(screen.queryByTestId('object-field-testProp')).not.toBeInTheDocument();

      const customButton = screen.getByTestId('testProp-custom-toggle').querySelector('button');
      expect(customButton).toHaveClass('pf-m-selected');

      // Switch back to standard view
      await user.click(screen.getByText('Standard'));
      expect(screen.getByTestId('object-field-testProp')).toBeInTheDocument();
      expect(screen.queryByTestId('array-field-wrapper')).not.toBeInTheDocument();
    });
  });

  describe('when schema has no properties', () => {
    it('should render PropertiesField without toggle buttons and with badge', () => {
      render(
        <SchemaContext.Provider value={schemaWithoutProperties}>
          <CustomTableToggle {...defaultProps} />
        </SchemaContext.Provider>,
      );

      expect(screen.getByTestId('properties-field-testProp')).toBeInTheDocument();
      expect(screen.queryByText('Standard')).not.toBeInTheDocument();
      expect(screen.queryByText('Custom')).not.toBeInTheDocument();

      // Should show badge with item count
      const badge = screen.getByText('2');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('title', '2 properties');

      // Should NOT show remove button when no schema properties
      expect(screen.queryByTestId('testProp__remove')).not.toBeInTheDocument();
    });

    it('should handle undefined properties object', () => {
      const schemaWithUndefined = {
        schema: { properties: undefined },
        definitions: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      render(
        <SchemaContext.Provider value={schemaWithUndefined}>
          <CustomTableToggle {...defaultProps} />
        </SchemaContext.Provider>,
      );

      expect(screen.getByTestId('properties-field-testProp')).toBeInTheDocument();
      expect(screen.queryByText('Standard')).not.toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('remove button and badge', () => {
    it('should display badge with correct item count in custom view', async () => {
      const user = userEvent.setup();

      render(
        <SchemaContext.Provider value={schemaWithProperties}>
          <CustomTableToggle {...defaultProps} />
        </SchemaContext.Provider>,
      );

      await user.click(screen.getByText('Custom'));

      const badge = screen.getByText('2');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('title', '2 properties');
    });

    it('should call onChange with undefined when remove button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <SchemaContext.Provider value={schemaWithProperties}>
          <CustomTableToggle {...defaultProps} />
        </SchemaContext.Provider>,
      );

      await user.click(screen.getByText('Custom'));

      const removeButton = screen.getByTestId('testProp__remove');
      await user.click(removeButton);

      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });

    it('should display badge with 0 when value is undefined', async () => {
      const user = userEvent.setup();

      mockUseFieldValue.mockReturnValue({
        value: undefined,
        onChange: mockOnChange,
      });

      render(
        <SchemaContext.Provider value={schemaWithProperties}>
          <CustomTableToggle {...defaultProps} />
        </SchemaContext.Provider>,
      );

      await user.click(screen.getByText('Custom'));
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should display badge with 0 when value is empty object', async () => {
      const user = userEvent.setup();

      mockUseFieldValue.mockReturnValue({
        value: {},
        onChange: mockOnChange,
      });

      render(
        <SchemaContext.Provider value={schemaWithProperties}>
          <CustomTableToggle {...defaultProps} />
        </SchemaContext.Provider>,
      );

      await user.click(screen.getByText('Custom'));
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
});
