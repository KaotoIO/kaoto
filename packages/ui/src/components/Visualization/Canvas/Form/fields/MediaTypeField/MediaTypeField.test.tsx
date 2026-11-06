import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { KaotoSchemaDefinition } from '../../../../../../models';
import { DefaultSettingsAdapter } from '../../../../../../models/settings';
import { SettingsProvider } from '../../../../../../providers';
import { MediaTypeField } from './MediaTypeField';

describe('MediaTypeField', () => {
  const mockSchema: KaotoSchemaDefinition['schema'] = {
    title: 'Media Type',
    description: 'Content type for the request/response',
    type: 'string',
  };

  let settingsAdapter: DefaultSettingsAdapter;

  const renderMediaTypeField = (model: Record<string, unknown> = {}, onPropertyChange = vi.fn()) => {
    return render(
      <SettingsProvider adapter={settingsAdapter}>
        <ModelContextProvider model={model} onPropertyChange={onPropertyChange}>
          <SchemaProvider schema={mockSchema}>
            <MediaTypeField propName="mediaType" />
          </SchemaProvider>
        </ModelContextProvider>
      </SettingsProvider>,
    );
  };

  beforeEach(() => {
    settingsAdapter = new DefaultSettingsAdapter();
  });

  describe('Rendering', () => {
    it('should render with placeholder text when no value is selected', () => {
      renderMediaTypeField();

      expect(screen.getByTestId('media-type-field-toggle')).toBeInTheDocument();
      expect(screen.getByText('Select media types')).toBeInTheDocument();
    });

    it('should render with selected values', () => {
      renderMediaTypeField({ mediaType: 'application/json, text/plain' });

      expect(screen.getByText('application/json, text/plain')).toBeInTheDocument();
    });

    it('should render with schema title and description', () => {
      const { container } = renderMediaTypeField();

      expect(container.querySelector('label')).toHaveTextContent('Media Type');
    });

    it('should render disabled when disabled prop is true', () => {
      const disabledSchema = { ...mockSchema };
      render(
        <SettingsProvider adapter={settingsAdapter}>
          <ModelContextProvider model={{}} onPropertyChange={vi.fn()} disabled>
            <SchemaProvider schema={disabledSchema}>
              <MediaTypeField propName="mediaType" />
            </SchemaProvider>
          </ModelContextProvider>
        </SettingsProvider>,
      );

      const toggle = screen.getByTestId('media-type-field-toggle');
      expect(toggle.querySelector('button.cds--list-box__field')).toBeDisabled();
    });
  });

  describe('Select Functionality', () => {
    it('should open dropdown when clicking toggle', async () => {
      renderMediaTypeField();

      const toggleBtn = screen.getByTestId('media-type-field-toggle').querySelector('button.cds--list-box__field')!;
      fireEvent.click(toggleBtn);

      await screen.findByRole('option', { name: 'application/json' });
      expect(screen.getByRole('option', { name: 'application/xml' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'text/plain' })).toBeInTheDocument();
    });

    it('should select a media type when clicking an option', async () => {
      const user = userEvent.setup();
      const onPropertyChange = vi.fn();
      renderMediaTypeField({}, onPropertyChange);

      const toggleBtn = screen.getByTestId('media-type-field-toggle').querySelector('button.cds--list-box__field')!;
      await user.click(toggleBtn);

      const option = await screen.findByRole('option', { name: 'application/json' });
      await user.click(option);

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/json');
    });

    it('should select multiple media types', async () => {
      const user = userEvent.setup();
      const model: Record<string, unknown> = {};
      const onPropertyChange = vi.fn((propName: string, value: unknown) => {
        model[propName] = value;
      });
      const { rerender } = renderMediaTypeField(model, onPropertyChange);

      const toggleBtn = screen.getByTestId('media-type-field-toggle').querySelector('button.cds--list-box__field')!;
      await user.click(toggleBtn);

      const option1 = await screen.findByRole('option', { name: 'application/json' });
      await user.click(option1);

      rerender(
        <SettingsProvider adapter={settingsAdapter}>
          <ModelContextProvider model={model} onPropertyChange={onPropertyChange}>
            <SchemaProvider schema={mockSchema}>
              <MediaTypeField propName="mediaType" />
            </SchemaProvider>
          </ModelContextProvider>
        </SettingsProvider>,
      );

      const option2 = screen.getByRole('option', { name: 'text/plain' });
      await user.click(option2);

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/json');
      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/json, text/plain');
    });

    it('should deselect a media type when clicking a selected option', async () => {
      const user = userEvent.setup();
      const onPropertyChange = vi.fn();
      renderMediaTypeField({ mediaType: 'application/json, text/plain' }, onPropertyChange);

      const toggleBtn = screen.getByTestId('media-type-field-toggle').querySelector('button.cds--list-box__field')!;
      await user.click(toggleBtn);

      const option = await screen.findByRole('option', { name: 'application/json' });
      await user.click(option);

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'text/plain');
    });

    it('should set value to undefined when deselecting the last item', async () => {
      const user = userEvent.setup();
      const onPropertyChange = vi.fn();
      renderMediaTypeField({ mediaType: 'application/json' }, onPropertyChange);

      const toggleBtn = screen.getByTestId('media-type-field-toggle').querySelector('button.cds--list-box__field')!;
      await user.click(toggleBtn);

      const option = await screen.findByRole('option', { name: 'application/json' });
      await user.click(option);

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', undefined);
    });

    it('should show checkboxes for selected items', async () => {
      renderMediaTypeField({ mediaType: 'application/json' });

      const toggleBtn = screen.getByTestId('media-type-field-toggle').querySelector('button.cds--list-box__field')!;
      fireEvent.click(toggleBtn);

      const option = await screen.findByRole('option', { name: 'application/json' });
      const checkbox = option.querySelector('input[type="checkbox"]')!;

      expect(checkbox).toBeChecked();
    });
  });

  describe('Custom Media Type Functionality', () => {
    it('should render custom media type input and add button', () => {
      renderMediaTypeField();

      expect(screen.getByPlaceholderText('Add custom media type')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });

    it('should add custom media type when clicking Add button', () => {
      const onPropertyChange = vi.fn();
      renderMediaTypeField({}, onPropertyChange);

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: 'application/custom' } });
      fireEvent.click(addButton);

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/custom');
    });

    it('should add custom media type when pressing Enter key', () => {
      const onPropertyChange = vi.fn();
      renderMediaTypeField({}, onPropertyChange);

      const input = screen.getByPlaceholderText('Add custom media type');

      fireEvent.change(input, { target: { value: 'application/custom' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/custom');
    });

    it('should clear input after adding custom media type', () => {
      renderMediaTypeField();

      const input = screen.getByPlaceholderText<HTMLInputElement>('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: 'application/custom' } });
      fireEvent.click(addButton);

      expect(input.value).toBe('');
    });

    it('should trim whitespace from custom media type', () => {
      const onPropertyChange = vi.fn();
      renderMediaTypeField({}, onPropertyChange);

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: '  application/custom  ' } });
      fireEvent.click(addButton);

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/custom');
    });

    it('should not add empty custom media type', () => {
      const onPropertyChange = vi.fn();
      renderMediaTypeField({}, onPropertyChange);

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(addButton);

      expect(onPropertyChange).not.toHaveBeenCalled();
    });

    it('should disable Add button when input is empty', () => {
      renderMediaTypeField();

      const addButton = screen.getByRole('button', { name: 'Add' });

      expect(addButton).toBeDisabled();
    });

    it('should enable Add button when input has value', () => {
      renderMediaTypeField();

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: 'test' } });

      expect(addButton).not.toBeDisabled();
    });

    it('should add custom media type to existing selection', () => {
      const onPropertyChange = vi.fn();
      renderMediaTypeField({ mediaType: 'application/json' }, onPropertyChange);

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: 'application/custom' } });
      fireEvent.click(addButton);

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/json, application/custom');
    });
  });

  describe('Settings Persistence', () => {
    it('should save custom media type to settings', () => {
      renderMediaTypeField();

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: 'application/custom' } });
      fireEvent.click(addButton);

      const settings = settingsAdapter.getSettings();
      expect(settings.rest.customMediaTypes).toContain('application/custom');
    });

    it('should not duplicate custom media types in settings', () => {
      const settings = settingsAdapter.getSettings();
      settingsAdapter.saveSettings({
        ...settings,
        rest: {
          ...settings.rest,
          customMediaTypes: ['application/existing'],
        },
      });

      renderMediaTypeField();

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: 'application/existing' } });
      fireEvent.click(addButton);

      const updatedSettings = settingsAdapter.getSettings();
      const customTypes = updatedSettings.rest.customMediaTypes;
      expect(customTypes.filter((type) => type === 'application/existing')).toHaveLength(1);
    });

    it('should display custom media types from settings in options', async () => {
      const settings = settingsAdapter.getSettings();
      settingsAdapter.saveSettings({
        ...settings,
        rest: {
          ...settings.rest,
          customMediaTypes: ['application/stored-custom'],
        },
      });

      renderMediaTypeField();

      const toggleBtn = screen.getByTestId('media-type-field-toggle').querySelector('button.cds--list-box__field')!;
      fireEvent.click(toggleBtn);

      await screen.findByRole('option', { name: 'application/stored-custom' });
      expect(screen.getByRole('option', { name: 'application/stored-custom' })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined value gracefully', () => {
      renderMediaTypeField({ mediaType: undefined });

      expect(screen.getByTestId('media-type-field-toggle')).toBeInTheDocument();
      expect(screen.getByText('Select media types')).toBeInTheDocument();
    });

    it('should handle empty string value', () => {
      renderMediaTypeField({ mediaType: '' });

      expect(screen.getByTestId('media-type-field-toggle')).toBeInTheDocument();
      expect(screen.getByText('Select media types')).toBeInTheDocument();
    });

    it('should parse comma-separated values correctly', () => {
      renderMediaTypeField({ mediaType: 'application/json, text/plain, application/xml' });

      expect(screen.getByText('application/json, text/plain, application/xml')).toBeInTheDocument();
    });

    it('should handle values with extra whitespace', () => {
      renderMediaTypeField({ mediaType: '  application/json  ,  text/plain  ' });

      expect(screen.getByText('application/json, text/plain')).toBeInTheDocument();
    });

    it('should display custom values that are not in common list', async () => {
      renderMediaTypeField({ mediaType: 'application/custom-type' });

      const toggleBtn = screen.getByTestId('media-type-field-toggle').querySelector('button.cds--list-box__field')!;
      fireEvent.click(toggleBtn);

      await screen.findByRole('option', { name: 'application/custom-type' });
      expect(screen.getByRole('option', { name: 'application/custom-type' })).toBeInTheDocument();
    });

    it('should not add duplicate custom media type to selection', () => {
      const onPropertyChange = vi.fn();
      renderMediaTypeField({ mediaType: 'application/custom' }, onPropertyChange);

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: 'application/custom' } });
      fireEvent.click(addButton);

      // Should not call onChange since the value is already selected
      expect(onPropertyChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable the toggle when field is disabled', () => {
      render(
        <SettingsProvider adapter={settingsAdapter}>
          <ModelContextProvider model={{}} onPropertyChange={vi.fn()} disabled>
            <SchemaProvider schema={mockSchema}>
              <MediaTypeField propName="mediaType" />
            </SchemaProvider>
          </ModelContextProvider>
        </SettingsProvider>,
      );

      const toggle = screen.getByTestId('media-type-field-toggle');
      expect(toggle.querySelector('button.cds--list-box__field')).toBeDisabled();
    });
  });
});
