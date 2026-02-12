import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { fireEvent, render, screen } from '@testing-library/react';

import { KaotoSchemaDefinition } from '../../../../../../models';
import { ArrayBadgesField } from './ArrayBadgesField';

describe('ArrayBadgesField', () => {
  const mockSchema: KaotoSchemaDefinition['schema'] = {
    title: 'Test Array Field',
    description: 'Test description for array field',
    type: 'array',
    items: { type: 'string' },
  };

  const ROOT_PATH = '.';

  describe('Rendering', () => {
    it('should render empty field with no items message', () => {
      render(
        <ModelContextProvider model={{}} onPropertyChange={jest.fn()}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName={ROOT_PATH} />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      expect(screen.getByText('No items added.')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Add new item')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
    });

    it('should render with existing items', () => {
      render(
        <ModelContextProvider model={{ testArray: ['item1', 'item2', 'item3'] }} onPropertyChange={jest.fn()}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName="testArray" />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      expect(screen.getByText('item1')).toBeInTheDocument();
      expect(screen.getByText('item2')).toBeInTheDocument();
      expect(screen.getByText('item3')).toBeInTheDocument();
      expect(screen.queryByText('No items added.')).not.toBeInTheDocument();
    });

    it('should render with schema title and description', () => {
      const { container } = render(
        <ModelContextProvider model={{}} onPropertyChange={jest.fn()}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName={ROOT_PATH} />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      expect(container.querySelector('label')).toHaveTextContent('Test Array Field');
    });

    it('should display items in alphabetical order', () => {
      render(
        <ModelContextProvider model={{ testArray: ['zebra', 'apple', 'banana'] }} onPropertyChange={jest.fn()}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName="testArray" />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      // Items should be displayed in alphabetical order

      expect(screen.getByText('apple')).toBeInTheDocument();

      expect(screen.getByText('banana')).toBeInTheDocument();

      expect(screen.getByText('zebra')).toBeInTheDocument();
    });
  });

  describe('Add Functionality', () => {
    it('should add new item when clicking Add button', () => {
      const onPropertyChange = jest.fn();
      render(
        <ModelContextProvider model={{}} onPropertyChange={onPropertyChange}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName={ROOT_PATH} />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      const input = screen.getByPlaceholderText('Add new item');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: 'newItem' } });
      fireEvent.click(addButton);

      expect(onPropertyChange).toHaveBeenCalledWith(ROOT_PATH, ['newItem']);
    });

    it('should trim whitespace from input before adding', () => {
      const onPropertyChange = jest.fn();
      render(
        <ModelContextProvider model={{}} onPropertyChange={onPropertyChange}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName={ROOT_PATH} />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      const input = screen.getByPlaceholderText('Add new item');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: '  trimmed  ' } });
      fireEvent.click(addButton);

      expect(onPropertyChange).toHaveBeenCalledWith(ROOT_PATH, ['trimmed']);
    });

    it('should not add empty strings', () => {
      const onPropertyChange = jest.fn();
      render(
        <ModelContextProvider model={{}} onPropertyChange={onPropertyChange}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName={ROOT_PATH} />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      const input = screen.getByPlaceholderText('Add new item');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(addButton);

      expect(onPropertyChange).not.toHaveBeenCalled();
    });

    it('should not add duplicate items', () => {
      const onPropertyChange = jest.fn();
      render(
        <ModelContextProvider model={{ testArray: ['existing'] }} onPropertyChange={onPropertyChange}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName="testArray" />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      const input = screen.getByPlaceholderText('Add new item');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: 'existing' } });
      fireEvent.click(addButton);

      expect(onPropertyChange).not.toHaveBeenCalled();
    });

    it('should clear input after adding item', () => {
      render(
        <ModelContextProvider model={{}} onPropertyChange={jest.fn()}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName={ROOT_PATH} />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      const input = screen.getByPlaceholderText<HTMLInputElement>('Add new item');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: 'newItem' } });
      fireEvent.click(addButton);

      expect(input.value).toBe('');
    });

    it('should disable Add button when input is empty', () => {
      render(
        <ModelContextProvider model={{}} onPropertyChange={jest.fn()}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName={ROOT_PATH} />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      const addButton = screen.getByRole('button', { name: 'Add' });
      expect(addButton).toBeDisabled();
    });

    it('should enable Add button when input has value', () => {
      render(
        <ModelContextProvider model={{}} onPropertyChange={jest.fn()}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName={ROOT_PATH} />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      const input = screen.getByPlaceholderText('Add new item');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: 'test' } });
      expect(addButton).not.toBeDisabled();
    });
  });

  describe('Remove Functionality', () => {
    it('should remove specific item when clicking close button', () => {
      const onPropertyChange = jest.fn();

      render(
        <ModelContextProvider model={{ testArray: ['item1', 'item2', 'item3'] }} onPropertyChange={onPropertyChange}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName="testArray" />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      const closeButtons = screen.getAllByRole('button', { name: /close/i });

      fireEvent.click(closeButtons[1]); // Remove 'item2'

      expect(onPropertyChange).toHaveBeenCalledWith('testArray', ['item1', 'item3']);
    });

    it('should update array correctly after removal', () => {
      const onPropertyChange = jest.fn();

      render(
        <ModelContextProvider model={{ testArray: ['apple', 'banana', 'cherry'] }} onPropertyChange={onPropertyChange}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName="testArray" />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      // Get all close buttons and click the first one (apple, since items are sorted)

      const closeButtons = screen.getAllByRole('button', { name: /close/i });

      fireEvent.click(closeButtons[0]);

      expect(onPropertyChange).toHaveBeenCalledWith('testArray', ['banana', 'cherry']);
    });
  });

  describe('Clear All Functionality', () => {
    it('should clear all items when clicking Clear all', () => {
      const onPropertyChange = jest.fn();

      render(
        <ModelContextProvider model={{ testArray: ['item1', 'item2', 'item3'] }} onPropertyChange={onPropertyChange}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName="testArray" />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      const clearAllButton = screen.getByRole('button', { name: 'Clear all' });

      fireEvent.click(clearAllButton);

      expect(onPropertyChange).toHaveBeenCalledWith('testArray', []);
    });

    it('should disable Clear all button when array is empty', () => {
      render(
        <ModelContextProvider model={{}} onPropertyChange={jest.fn()}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName={ROOT_PATH} />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      const clearAllButton = screen.getByRole('button', { name: 'Clear all' });
      expect(clearAllButton).toBeDisabled();
    });

    it('should enable Clear all button when array has items', () => {
      render(
        <ModelContextProvider model={{ testArray: ['item1'] }} onPropertyChange={jest.fn()}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName="testArray" />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      const clearAllButton = screen.getByRole('button', { name: 'Clear all' });
      expect(clearAllButton).not.toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined value gracefully', () => {
      render(
        <ModelContextProvider model={{ testArray: undefined }} onPropertyChange={jest.fn()}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName="testArray" />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      expect(screen.getByText('No items added.')).toBeInTheDocument();
    });

    it('should handle null value gracefully', () => {
      render(
        <ModelContextProvider model={{ testArray: null }} onPropertyChange={jest.fn()}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName="testArray" />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      expect(screen.getByText('No items added.')).toBeInTheDocument();
    });

    it('should handle adding to undefined array', () => {
      const onPropertyChange = jest.fn();
      render(
        <ModelContextProvider model={{}} onPropertyChange={onPropertyChange}>
          <SchemaProvider schema={mockSchema}>
            <ArrayBadgesField propName={ROOT_PATH} />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      const input = screen.getByPlaceholderText('Add new item');
      const addButton = screen.getByRole('button', { name: 'Add' });

      fireEvent.change(input, { target: { value: 'first' } });
      fireEvent.click(addButton);

      expect(onPropertyChange).toHaveBeenCalledWith(ROOT_PATH, ['first']);
    });
  });
});
