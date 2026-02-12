import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

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

  const renderMediaTypeField = (model: Record<string, unknown> = {}, onPropertyChange = jest.fn()) => {
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

      expect(screen.getByRole('button', { name: /select media types/i })).toBeInTheDocument();
    });

    it('should render with selected values', () => {
      renderMediaTypeField({ mediaType: 'application/json, text/plain' });

      expect(screen.getByRole('button', { name: /application\/json, text\/plain/i })).toBeInTheDocument();
    });

    it('should render with schema title and description', () => {
      const { container } = renderMediaTypeField();

      expect(container.querySelector('label')).toHaveTextContent('Media Type');
    });

    it('should render disabled when disabled prop is true', () => {
      const disabledSchema = { ...mockSchema };
      render(
        <SettingsProvider adapter={settingsAdapter}>
          <ModelContextProvider model={{}} onPropertyChange={jest.fn()} disabled>
            <SchemaProvider schema={disabledSchema}>
              <MediaTypeField propName="mediaType" />
            </SchemaProvider>
          </ModelContextProvider>
        </SettingsProvider>,
      );

      expect(screen.getByRole('button', { name: /select media types/i })).toBeDisabled();
    });
  });

  describe('Select Functionality', () => {
    it('should open dropdown when clicking toggle', async () => {
      renderMediaTypeField();

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      expect(screen.getByRole('menuitem', { name: 'application/json' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'application/xml' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'text/plain' })).toBeInTheDocument();
    });

    it('should select a media type when clicking an option', async () => {
      const onPropertyChange = jest.fn();
      renderMediaTypeField({}, onPropertyChange);

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const option = screen.getByRole('menuitem', { name: 'application/json' });
      const checkbox = within(option).getByRole('checkbox');

      await act(async () => {
        fireEvent.click(checkbox);
      });

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/json');
    });

    it('should select multiple media types', async () => {
      const model: Record<string, unknown> = {};
      const onPropertyChange = jest.fn((propName: string, value: unknown) => {
        model[propName] = value;
      });
      const { rerender } = renderMediaTypeField(model, onPropertyChange);

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const option1 = screen.getByRole('menuitem', { name: 'application/json' });
      const checkbox1 = within(option1).getByRole('checkbox');

      await act(async () => {
        fireEvent.click(checkbox1);
      });

      rerender(
        <SettingsProvider adapter={settingsAdapter}>
          <ModelContextProvider model={model} onPropertyChange={onPropertyChange}>
            <SchemaProvider schema={mockSchema}>
              <MediaTypeField propName="mediaType" />
            </SchemaProvider>
          </ModelContextProvider>
        </SettingsProvider>,
      );

      const option2 = screen.getByRole('menuitem', { name: 'text/plain' });
      const checkbox2 = within(option2).getByRole('checkbox');

      await act(async () => {
        fireEvent.click(checkbox2);
      });

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/json');
      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/json, text/plain');
    });

    it('should deselect a media type when clicking a selected option', async () => {
      const onPropertyChange = jest.fn();
      renderMediaTypeField({ mediaType: 'application/json, text/plain' }, onPropertyChange);

      const toggle = screen.getByRole('button', { name: /application\/json, text\/plain/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const option = screen.getByRole('menuitem', { name: 'application/json' });
      const checkbox = within(option).getByRole('checkbox');

      await act(async () => {
        fireEvent.click(checkbox);
      });

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'text/plain');
    });

    it('should set value to undefined when deselecting the last item', async () => {
      const onPropertyChange = jest.fn();
      renderMediaTypeField({ mediaType: 'application/json' }, onPropertyChange);

      const toggle = screen.getByRole('button', { name: /application\/json/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const option = screen.getByRole('menuitem', { name: 'application/json' });
      const checkbox = within(option).getByRole('checkbox');

      await act(async () => {
        fireEvent.click(checkbox);
      });

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', undefined);
    });

    it('should show checkboxes for selected items', async () => {
      renderMediaTypeField({ mediaType: 'application/json' });

      const toggle = screen.getByRole('button', { name: /application\/json/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const option = screen.getByRole('menuitem', { name: 'application/json' });
      const checkbox = within(option).getByRole('checkbox');

      expect(checkbox).toBeChecked();
    });
  });

  describe('Custom Media Type Functionality', () => {
    it('should render custom media type input and add button', async () => {
      renderMediaTypeField();

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      expect(screen.getByPlaceholderText('Add custom media type')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });

    it('should add custom media type when clicking Add button', async () => {
      const onPropertyChange = jest.fn();
      renderMediaTypeField({}, onPropertyChange);

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'application/custom' } });
      });

      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/custom');
    });

    it('should add custom media type when pressing Enter key', async () => {
      const onPropertyChange = jest.fn();
      renderMediaTypeField({}, onPropertyChange);

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const input = screen.getByPlaceholderText('Add custom media type');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'application/custom' } });
      });

      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      });

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/custom');
    });

    it('should clear input after adding custom media type', async () => {
      renderMediaTypeField();

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const input = screen.getByPlaceholderText<HTMLInputElement>('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'application/custom' } });
      });

      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(input.value).toBe('');
    });

    it('should trim whitespace from custom media type', async () => {
      const onPropertyChange = jest.fn();
      renderMediaTypeField({}, onPropertyChange);

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      await act(async () => {
        fireEvent.change(input, { target: { value: '  application/custom  ' } });
      });

      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/custom');
    });

    it('should not add empty custom media type', async () => {
      const onPropertyChange = jest.fn();
      renderMediaTypeField({}, onPropertyChange);

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      await act(async () => {
        fireEvent.change(input, { target: { value: '   ' } });
      });

      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(onPropertyChange).not.toHaveBeenCalled();
    });

    it('should disable Add button when input is empty', async () => {
      renderMediaTypeField();

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const addButton = screen.getByRole('button', { name: 'Add' });

      expect(addButton).toBeDisabled();
    });

    it('should enable Add button when input has value', async () => {
      renderMediaTypeField();

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'test' } });
      });

      expect(addButton).not.toBeDisabled();
    });

    it('should add custom media type to existing selection', async () => {
      const onPropertyChange = jest.fn();
      renderMediaTypeField({ mediaType: 'application/json' }, onPropertyChange);

      const toggle = screen.getByRole('button', { name: /application\/json/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'application/custom' } });
      });

      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(onPropertyChange).toHaveBeenCalledWith('mediaType', 'application/json, application/custom');
    });
  });

  describe('Settings Persistence', () => {
    it('should save custom media type to settings', async () => {
      renderMediaTypeField();

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'application/custom' } });
      });

      await act(async () => {
        fireEvent.click(addButton);
      });

      const settings = settingsAdapter.getSettings();
      expect(settings.rest.customMediaTypes).toContain('application/custom');
    });

    it('should not duplicate custom media types in settings', async () => {
      // Pre-populate settings with a custom media type
      const settings = settingsAdapter.getSettings();
      settingsAdapter.saveSettings({
        ...settings,
        rest: {
          ...settings.rest,
          customMediaTypes: ['application/existing'],
        },
      });

      renderMediaTypeField();

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'application/existing' } });
      });

      await act(async () => {
        fireEvent.click(addButton);
      });

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

      const toggle = screen.getByRole('button', { name: /select media types/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      expect(screen.getByRole('menuitem', { name: 'application/stored-custom' })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined value gracefully', () => {
      renderMediaTypeField({ mediaType: undefined });

      expect(screen.getByRole('button', { name: /select media types/i })).toBeInTheDocument();
    });

    it('should handle empty string value', () => {
      renderMediaTypeField({ mediaType: '' });

      expect(screen.getByRole('button', { name: /select media types/i })).toBeInTheDocument();
    });

    it('should parse comma-separated values correctly', () => {
      renderMediaTypeField({ mediaType: 'application/json, text/plain, application/xml' });

      expect(
        screen.getByRole('button', { name: /application\/json, text\/plain, application\/xml/i }),
      ).toBeInTheDocument();
    });

    it('should handle values with extra whitespace', () => {
      renderMediaTypeField({ mediaType: '  application/json  ,  text/plain  ' });

      expect(screen.getByRole('button', { name: /application\/json, text\/plain/i })).toBeInTheDocument();
    });

    it('should display custom values that are not in common list', async () => {
      renderMediaTypeField({ mediaType: 'application/custom-type' });

      const toggle = screen.getByRole('button', { name: /application\/custom-type/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      expect(screen.getByRole('menuitem', { name: 'application/custom-type' })).toBeInTheDocument();
    });

    it('should not add duplicate custom media type to selection', async () => {
      const onPropertyChange = jest.fn();
      renderMediaTypeField({ mediaType: 'application/custom' }, onPropertyChange);

      const toggle = screen.getByRole('button', { name: /application\/custom/i });

      await act(async () => {
        fireEvent.click(toggle);
      });

      const input = screen.getByPlaceholderText('Add custom media type');
      const addButton = screen.getByRole('button', { name: 'Add' });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'application/custom' } });
      });

      await act(async () => {
        fireEvent.click(addButton);
      });

      // Should not call onChange since the value is already selected
      expect(onPropertyChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable the toggle when field is disabled', () => {
      render(
        <SettingsProvider adapter={settingsAdapter}>
          <ModelContextProvider model={{}} onPropertyChange={jest.fn()} disabled>
            <SchemaProvider schema={mockSchema}>
              <MediaTypeField propName="mediaType" />
            </SchemaProvider>
          </ModelContextProvider>
        </SettingsProvider>,
      );

      const toggle = screen.getByRole('button', { name: /select media types/i });

      expect(toggle).toBeDisabled();
    });
  });
});
