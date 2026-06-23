import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { ComponentProps } from 'react';

import { sourceSchemaConfig, SourceSchemaType } from '../../../../../models/camel';
import { configureSourceSchemaTypes, TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../../../../stubs';
import { IntegrationTypeSelectorToggle } from './IntegrationTypeSelectorToggle';

describe('IntegrationTypeSelectorToggle.tsx', () => {
  const config = sourceSchemaConfig;
  const previousSchemas = {
    [SourceSchemaType.Pipe]: config.config[SourceSchemaType.Pipe].schema,
    [SourceSchemaType.Kamelet]: config.config[SourceSchemaType.Kamelet].schema,
    [SourceSchemaType.Route]: config.config[SourceSchemaType.Route].schema,
  };

  beforeAll(() => {
    configureSourceSchemaTypes();
  });

  afterAll(() => {
    config.config[SourceSchemaType.Pipe].schema = previousSchemas[SourceSchemaType.Pipe];
    config.config[SourceSchemaType.Kamelet].schema = previousSchemas[SourceSchemaType.Kamelet];
    config.config[SourceSchemaType.Route].schema = previousSchemas[SourceSchemaType.Route];
  });

  const renderToggle = async (props?: ComponentProps<typeof IntegrationTypeSelectorToggle>) => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = await TestProvidersWrapper();
    return render(
      <RuntimeProvider>
        <Provider>
          <IntegrationTypeSelectorToggle {...props} />
        </Provider>
      </RuntimeProvider>,
    );
  };

  it('component renders', async () => {
    const wrapper = await renderToggle();
    const toggle = wrapper.queryByTestId('integration-type-list-dropdown');
    expect(toggle).toBeInTheDocument();
  });

  it('should call onSelect when clicking on the MenuToggleAction', async () => {
    const onSelectSpy = vi.fn();
    const wrapper = await renderToggle({ onSelect: onSelectSpy });

    /** Click on toggle */
    const toggle = await wrapper.findByTestId('integration-type-list-dropdown');
    act(() => {
      fireEvent.click(toggle);
    });

    /** Click on first element */
    const element = await wrapper.findByText('Pipe');
    act(() => {
      fireEvent.click(element);
    });

    await waitFor(() => {
      expect(onSelectSpy).toHaveBeenCalled();
    });
  });

  it('should disable the MenuToggleAction if the integration type is already selected', async () => {
    const wrapper = await renderToggle();
    /** Click on toggle */
    const toggle = await wrapper.findByTestId('integration-type-list-dropdown');
    act(() => {
      fireEvent.click(toggle);
    });

    /** Click on first element */
    const element = await wrapper.findAllByRole('option');
    act(() => {
      fireEvent.click(element[0]);
    });

    act(() => {
      fireEvent.click(toggle);
    });

    await waitFor(async () => {
      expect(element[0]).toBeDisabled();
    });
  });

  it('should toggle list of integration types', async () => {
    const wrapper = await renderToggle();
    const toggle = await wrapper.findByTestId('integration-type-list-dropdown');

    /** Click on toggle */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByText('Pipe');
    await waitFor(() => {
      expect(element).toBeInTheDocument();
    });
    /** Close Select */
    act(() => {
      fireEvent.click(toggle);
    });

    await waitFor(() => {
      expect(element).not.toBeInTheDocument();
    });
  });

  it('should show selected value', async () => {
    const wrapper = await renderToggle();
    const toggle = await wrapper.findByTestId('integration-type-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    /** Click on first element */
    act(() => {
      const element = wrapper.getByText('Camel Route');
      fireEvent.click(element);
    });

    /** Open Select again */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByRole('option', { selected: true });
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Camel Route');
  });

  it('should have selected integration type if provided', async () => {
    const wrapper = await renderToggle();
    const toggle = await wrapper.findByTestId('integration-type-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    await waitFor(() => {
      const element = wrapper.queryByRole('option', { selected: true });
      expect(element).toBeInTheDocument();
      expect(element).toHaveTextContent('Camel Route');
    });
  });

  it('should close Select when pressing ESC', async () => {
    const wrapper = await renderToggle();
    const toggle = await wrapper.findByTestId('integration-type-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    const menu = await wrapper.findByRole('listbox');

    expect(menu).toBeInTheDocument();

    /** Press Escape key to close the menu */
    act(() => {
      fireEvent.focus(menu);
      fireEvent.keyDown(menu, { key: 'Escape', code: 'Escape', charCode: 27 });
    });

    await waitFor(async () => {
      /** The close panel is an async process */
      expect(menu).not.toBeInTheDocument();
    });
  });
});
