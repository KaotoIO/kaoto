import {
  CanvasFormTabsProvider,
  FormComponentFactoryProvider,
  ModelContextProvider,
  SchemaContext,
} from '@kaoto/forms';
import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { FunctionComponent, PropsWithChildren } from 'react';

import { EndpointPropertiesField } from './EndpointPropertiesField';
import { MultiValuePropertyService } from './MultiValueProperty.service';

const mockOnChange = vi.fn();

/** Real @kaoto/forms providers, so useFieldValue('testProp') reads `model.testProp` and writes through `mockOnChange` */
const FormProviders: FunctionComponent<PropsWithChildren<{ model: Record<string, unknown> }>> = ({
  model,
  children,
}) => (
  <CanvasFormTabsProvider tab="All">
    <FormComponentFactoryProvider>
      <ModelContextProvider model={model} onPropertyChange={mockOnChange}>
        {children}
      </ModelContextProvider>
    </FormComponentFactoryProvider>
  </CanvasFormTabsProvider>
);

/**
 * The ArrayFieldWrapper header badge of EndpointPropertiesField comes first in the document,
 * the real PropertiesField renders its own badge with the same count afterwards
 */
const getEndpointPropertiesBadge = (count: number) => screen.getAllByTitle(`${count} properties`)[0];

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

  const defaultModel = { testProp: { key1: 'value1', key2: 'value2' } };

  beforeEach(() => {
    vi.spyOn(MultiValuePropertyService, 'getMultiValueProperties').mockReturnValue(Promise.resolve(new Map()));
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
        <FormProviders model={defaultModel}>
          <SchemaContext.Provider value={schemaWithProperties}>
            <EndpointPropertiesField {...defaultProps} />
          </SchemaContext.Provider>
        </FormProviders>,
      );

      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();

      expect(await screen.findByTestId('testProp.prop1__field-wrapper')).toBeInTheDocument();
      expect(screen.queryByText('Endpoint Properties')).not.toBeInTheDocument();

      const standardToggle = screen.getByTestId('testProp-standard-toggle');
      expect(standardToggle).toHaveClass('cds--content-switcher--selected');
    });

    it('should switch to custom view and back', async () => {
      const user = userEvent.setup();

      await renderWithSuspense(
        <FormProviders model={defaultModel}>
          <SchemaContext.Provider value={schemaWithProperties}>
            <EndpointPropertiesField {...defaultProps} />
          </SchemaContext.Provider>
        </FormProviders>,
      );

      // Wait for Suspense to resolve before interacting
      await screen.findByTestId('testProp.prop1__field-wrapper');

      // Switch to custom view
      await user.click(screen.getByText('Custom'));

      expect(await screen.findByText('Endpoint Properties')).toBeInTheDocument();
      expect(screen.getByDisplayValue('key1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('value1')).toBeInTheDocument();
      expect(screen.queryByTestId('testProp.prop1__field-wrapper')).not.toBeInTheDocument();

      const customToggle = screen.getByTestId('testProp-custom-toggle');
      expect(customToggle).toHaveClass('cds--content-switcher--selected');

      // Switch back to standard view
      await user.click(screen.getByText('Standard'));
      expect(await screen.findByTestId('testProp.prop1__field-wrapper')).toBeInTheDocument();
      expect(screen.queryByText('Endpoint Properties')).not.toBeInTheDocument();
    });
  });

  describe('when schema has no properties', () => {
    it('should render PropertiesField without toggle buttons and with badge', async () => {
      render(
        <FormProviders model={defaultModel}>
          <SchemaContext.Provider value={schemaWithoutProperties}>
            <EndpointPropertiesField {...defaultProps} />
          </SchemaContext.Provider>
        </FormProviders>,
      );

      expect(await screen.findByDisplayValue('key1')).toBeInTheDocument();
      expect(screen.getByText('Endpoint Properties')).toBeInTheDocument();
      expect(screen.queryByText('Standard')).not.toBeInTheDocument();
      expect(screen.queryByText('Custom')).not.toBeInTheDocument();

      // Should show badge with item count
      const badge = getEndpointPropertiesBadge(2);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('2');

      // Should show remove button to allow clearing properties
      expect(screen.getByTestId('testProp__remove')).toBeInTheDocument();
    });

    it('should handle undefined properties object', async () => {
      const schemaWithUndefined = {
        schema: { properties: undefined },
        definitions: {},
      };

      render(
        <FormProviders model={defaultModel}>
          <SchemaContext.Provider value={schemaWithUndefined}>
            <EndpointPropertiesField {...defaultProps} />
          </SchemaContext.Provider>
        </FormProviders>,
      );

      expect(await screen.findByDisplayValue('key1')).toBeInTheDocument();
      expect(screen.queryByText('Standard')).not.toBeInTheDocument();
      expect(getEndpointPropertiesBadge(2)).toHaveTextContent('2');
    });
  });

  describe('remove button and badge', () => {
    it('should display badge with correct item count in custom view', async () => {
      const user = userEvent.setup();

      await renderWithSuspense(
        <FormProviders model={defaultModel}>
          <SchemaContext.Provider value={schemaWithProperties}>
            <EndpointPropertiesField {...defaultProps} />
          </SchemaContext.Provider>
        </FormProviders>,
      );

      // Wait for Suspense in standard view before switching
      await screen.findByTestId('testProp.prop1__field-wrapper');

      await user.click(screen.getByText('Custom'));

      await screen.findByText('Endpoint Properties');
      const badge = getEndpointPropertiesBadge(2);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('2');
    });

    it('should call onChange with undefined when remove button is clicked', async () => {
      const user = userEvent.setup();

      await renderWithSuspense(
        <FormProviders model={defaultModel}>
          <SchemaContext.Provider value={schemaWithProperties}>
            <EndpointPropertiesField {...defaultProps} />
          </SchemaContext.Provider>
        </FormProviders>,
      );

      // Wait for Suspense in standard view before switching
      await screen.findByTestId('testProp.prop1__field-wrapper');

      await user.click(screen.getByText('Custom'));

      const removeButton = await screen.findByTestId('testProp__remove');
      await user.click(removeButton);

      expect(mockOnChange).toHaveBeenCalledWith('testProp', undefined);
    });

    it('should display badge with 0 when value is undefined', async () => {
      const user = userEvent.setup();

      await renderWithSuspense(
        <FormProviders model={{}}>
          <SchemaContext.Provider value={schemaWithProperties}>
            <EndpointPropertiesField {...defaultProps} />
          </SchemaContext.Provider>
        </FormProviders>,
      );

      // Wait for Suspense in standard view before switching
      await screen.findByTestId('testProp.prop1__field-wrapper');

      await user.click(screen.getByText('Custom'));
      await screen.findByText('Endpoint Properties');
      expect(getEndpointPropertiesBadge(0)).toHaveTextContent('0');
    });

    it('should display badge with 0 when value is empty object', async () => {
      const user = userEvent.setup();

      await renderWithSuspense(
        <FormProviders model={{ testProp: {} }}>
          <SchemaContext.Provider value={schemaWithProperties}>
            <EndpointPropertiesField {...defaultProps} />
          </SchemaContext.Provider>
        </FormProviders>,
      );

      // Wait for Suspense in standard view before switching
      await screen.findByTestId('testProp.prop1__field-wrapper');

      await user.click(screen.getByText('Custom'));
      await screen.findByText('Endpoint Properties');
      expect(getEndpointPropertiesBadge(0)).toHaveTextContent('0');
    });
  });
});
