import { SchemaContext } from '@kaoto/forms';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { CustomTableToggle } from './CustomTableToggle';

jest.mock('@kaoto/forms', () => ({
  ...jest.requireActual('@kaoto/forms'),
  ObjectField: ({ propName }: { propName: string }) => (
    <div data-testid={`object-field-${propName}`}>ObjectField: {propName}</div>
  ),
  PropertiesField: ({ propName }: { propName: string }) => (
    <div data-testid={`properties-field-${propName}`}>PropertiesField: {propName}</div>
  ),
  ArrayFieldWrapper: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="array-field-wrapper">
      <div data-testid="array-field-title">{title}</div>
      {children}
    </div>
  ),
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
      expect(screen.getByTestId('array-field-title')).toHaveTextContent('Custom properties table');
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
    it('should render PropertiesField without toggle buttons', () => {
      render(
        <SchemaContext.Provider value={schemaWithoutProperties}>
          <CustomTableToggle {...defaultProps} />
        </SchemaContext.Provider>,
      );

      expect(screen.getByTestId('properties-field-testProp')).toBeInTheDocument();
      expect(screen.queryByText('Standard')).not.toBeInTheDocument();
      expect(screen.queryByText('Custom')).not.toBeInTheDocument();
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
    });
  });
});
