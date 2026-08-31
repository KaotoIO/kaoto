import { SchemaContext } from '@kaoto/forms';
import { act, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { EndpointPropertiesField } from './EndpointPropertiesField';
import { MultiValuePropertyService } from './MultiValueProperty.service';

const mockOnChange = vi.fn();
const mockUseFieldValue = vi.fn();

vi.mock('@kaoto/forms', async () => ({
  ...(await vi.importActual('@kaoto/forms')),
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

describe('EndpointPropertiesField', () => {
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
    vi.spyOn(MultiValuePropertyService, 'getMultiValueProperties').mockReturnValue(Promise.resolve(new Map()));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Renders the component inside `await act(async () => ...)` so that the
   * microtask queue drains and the <Suspense> boundary resolves before the
   * first assertion. Plain `render()` uses a synchronous act internally and
   * exits before the already-settled promise microtask fires, causing
   * `findByTestId` to time out waiting for the standard view.
   * The eslint rule cannot detect Suspense inside the tree, so we suppress it.
   */

  const renderWithSuspense = async (ui: React.ReactElement) =>
    // eslint-disable-next-line testing-library/no-unnecessary-act
    act(async () => render(ui));

  describe('when schema has properties', () => {
    it('should render toggle buttons with standard view by default', async () => {
      await renderWithSuspense(
        <SchemaContext.Provider value={schemaWithProperties}>
          <EndpointPropertiesField {...defaultProps} />
        </SchemaContext.Provider>,
      );

      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();

      expect(await screen.findByTestId('object-field-testProp')).toBeInTheDocument();
      expect(screen.queryByTestId('array-field-wrapper')).not.toBeInTheDocument();

      const standardToggle = screen.getByTestId('testProp-standard-toggle');
      expect(within(standardToggle).getByRole('button')).toHaveClass('pf-m-selected');
    });

    it('should switch to custom view and back', async () => {
      const user = userEvent.setup();

      await renderWithSuspense(
        <SchemaContext.Provider value={schemaWithProperties}>
          <EndpointPropertiesField {...defaultProps} />
        </SchemaContext.Provider>,
      );

      // Wait for Suspense to resolve before interacting
      await screen.findByTestId('object-field-testProp');

      // Switch to custom view
      await user.click(screen.getByText('Custom'));

      expect(await screen.findByTestId('array-field-wrapper')).toBeInTheDocument();
      expect(screen.getByTestId('array-field-title')).toHaveTextContent('Endpoint Properties');
      expect(screen.getByTestId('properties-field-testProp')).toBeInTheDocument();
      expect(screen.queryByTestId('object-field-testProp')).not.toBeInTheDocument();

      const customToggle = screen.getByTestId('testProp-custom-toggle');
      expect(within(customToggle).getByRole('button')).toHaveClass('pf-m-selected');

      // Switch back to standard view
      await user.click(screen.getByText('Standard'));
      expect(await screen.findByTestId('object-field-testProp')).toBeInTheDocument();
      expect(screen.queryByTestId('array-field-wrapper')).not.toBeInTheDocument();
    });
  });

  describe('when schema has no properties', () => {
    it('should render PropertiesField without toggle buttons and with badge', async () => {
      render(
        <SchemaContext.Provider value={schemaWithoutProperties}>
          <EndpointPropertiesField {...defaultProps} />
        </SchemaContext.Provider>,
      );

      expect(await screen.findByTestId('properties-field-testProp')).toBeInTheDocument();
      expect(screen.queryByText('Standard')).not.toBeInTheDocument();
      expect(screen.queryByText('Custom')).not.toBeInTheDocument();

      // Should show badge with item count
      const badge = screen.getByText('2');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('title', '2 properties');

      // Should show remove button to allow clearing properties
      expect(screen.getByTestId('testProp__remove')).toBeInTheDocument();
    });

    it('should handle undefined properties object', async () => {
      const schemaWithUndefined = {
        schema: { properties: undefined },
        definitions: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      render(
        <SchemaContext.Provider value={schemaWithUndefined}>
          <EndpointPropertiesField {...defaultProps} />
        </SchemaContext.Provider>,
      );

      expect(await screen.findByTestId('properties-field-testProp')).toBeInTheDocument();
      expect(screen.queryByText('Standard')).not.toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('remove button and badge', () => {
    it('should display badge with correct item count in custom view', async () => {
      const user = userEvent.setup();

      await renderWithSuspense(
        <SchemaContext.Provider value={schemaWithProperties}>
          <EndpointPropertiesField {...defaultProps} />
        </SchemaContext.Provider>,
      );

      // Wait for Suspense in standard view before switching
      await screen.findByTestId('object-field-testProp');

      await user.click(screen.getByText('Custom'));

      const badge = await screen.findByText('2');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('title', '2 properties');
    });

    it('should call onChange with undefined when remove button is clicked', async () => {
      const user = userEvent.setup();

      await renderWithSuspense(
        <SchemaContext.Provider value={schemaWithProperties}>
          <EndpointPropertiesField {...defaultProps} />
        </SchemaContext.Provider>,
      );

      // Wait for Suspense in standard view before switching
      await screen.findByTestId('object-field-testProp');

      await user.click(screen.getByText('Custom'));

      const removeButton = await screen.findByTestId('testProp__remove');
      await user.click(removeButton);

      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });

    it('should display badge with 0 when value is undefined', async () => {
      const user = userEvent.setup();

      mockUseFieldValue.mockReturnValue({
        value: undefined,
        onChange: mockOnChange,
      });

      await renderWithSuspense(
        <SchemaContext.Provider value={schemaWithProperties}>
          <EndpointPropertiesField {...defaultProps} />
        </SchemaContext.Provider>,
      );

      // Wait for Suspense in standard view before switching
      await screen.findByTestId('object-field-testProp');

      await user.click(screen.getByText('Custom'));
      expect(await screen.findByText('0')).toBeInTheDocument();
    });

    it('should display badge with 0 when value is empty object', async () => {
      const user = userEvent.setup();

      mockUseFieldValue.mockReturnValue({
        value: {},
        onChange: mockOnChange,
      });

      await renderWithSuspense(
        <SchemaContext.Provider value={schemaWithProperties}>
          <EndpointPropertiesField {...defaultProps} />
        </SchemaContext.Provider>,
      );

      // Wait for Suspense in standard view before switching
      await screen.findByTestId('object-field-testProp');

      await user.click(screen.getByText('Custom'));
      expect(await screen.findByText('0')).toBeInTheDocument();
    });
  });
});
