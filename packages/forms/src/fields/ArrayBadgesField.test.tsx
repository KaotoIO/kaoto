import { fireEvent, render, screen } from '@testing-library/react';

import { ModelContextProvider, SchemaProvider } from '../providers';
import { ArrayBadgesField } from './ArrayBadgesField';

describe('ArrayBadgesField', () => {
  const PROP_NAME = 'testArray';
  const mockSchema = {
    title: 'Test Array Field',
    description: 'Test description for array field',
    type: 'array' as const,
    items: { type: 'string' as const },
  };

  const renderField = (model: Record<string, unknown> = {}, onPropertyChange = vi.fn()) =>
    render(
      <ModelContextProvider model={model} onPropertyChange={onPropertyChange}>
        <SchemaProvider schema={mockSchema}>
          <ArrayBadgesField propName={PROP_NAME} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

  const getInput = () => screen.getByPlaceholderText<HTMLInputElement>('Add new item');
  const getAddButton = () => screen.getByRole('button', { name: 'Add' });
  const getClearAllButton = () => screen.getByRole('button', { name: 'Clear all' });

  describe('Rendering', () => {
    it('should render empty field with no items message', () => {
      renderField();

      expect(screen.getByText('No items added.')).toBeInTheDocument();
      expect(getInput()).toBeInTheDocument();
      expect(getAddButton()).toBeInTheDocument();
      expect(getClearAllButton()).toBeInTheDocument();
    });

    it.each([undefined, null])('should render the empty state when the value is %s', (value) => {
      renderField({ [PROP_NAME]: value });

      expect(screen.getByText('No items added.')).toBeInTheDocument();
    });

    it('should render with existing items', () => {
      renderField({ [PROP_NAME]: ['item1', 'item2', 'item3'] });

      expect(screen.getByText('item1')).toBeInTheDocument();
      expect(screen.getByText('item2')).toBeInTheDocument();
      expect(screen.getByText('item3')).toBeInTheDocument();
      expect(screen.queryByText('No items added.')).not.toBeInTheDocument();
    });

    it('should render with schema title', () => {
      const { container } = renderField();

      expect(container.querySelector('label')).toHaveTextContent('Test Array Field');
    });

    it('should display items in alphabetical order', () => {
      renderField({ [PROP_NAME]: ['zebra', 'apple', 'banana'] });

      const items = screen.getAllByText(/^(apple|banana|zebra)$/).map((item) => item.textContent);

      expect(items).toEqual(['apple', 'banana', 'zebra']);
    });
  });

  describe('Add Functionality', () => {
    it('should add new item when clicking Add button', () => {
      const onPropertyChange = vi.fn();
      renderField({}, onPropertyChange);

      fireEvent.change(getInput(), { target: { value: 'newItem' } });
      fireEvent.click(getAddButton());

      expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, ['newItem']);
    });

    it('should trim whitespace from input before adding', () => {
      const onPropertyChange = vi.fn();
      renderField({}, onPropertyChange);

      fireEvent.change(getInput(), { target: { value: '  trimmed  ' } });
      fireEvent.click(getAddButton());

      expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, ['trimmed']);
    });

    it('should not add empty strings', () => {
      const onPropertyChange = vi.fn();
      renderField({}, onPropertyChange);

      fireEvent.change(getInput(), { target: { value: '   ' } });
      fireEvent.click(getAddButton());

      expect(onPropertyChange).not.toHaveBeenCalled();
    });

    it('should not add duplicate items', () => {
      const onPropertyChange = vi.fn();
      renderField({ [PROP_NAME]: ['existing'] }, onPropertyChange);

      fireEvent.change(getInput(), { target: { value: 'existing' } });
      fireEvent.click(getAddButton());

      expect(onPropertyChange).not.toHaveBeenCalled();
    });

    it('should clear input after adding item', () => {
      renderField();
      const input = getInput();

      fireEvent.change(input, { target: { value: 'newItem' } });
      fireEvent.click(getAddButton());

      expect(input.value).toBe('');
    });

    it('should enable the Add button only when the input has a value', () => {
      renderField();

      expect(getAddButton()).toBeDisabled();

      fireEvent.change(getInput(), { target: { value: 'test' } });

      expect(getAddButton()).not.toBeDisabled();
    });

    it('should add item when pressing Enter key', () => {
      const onPropertyChange = vi.fn();
      renderField({}, onPropertyChange);
      const input = getInput();

      fireEvent.change(input, { target: { value: 'enterItem' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, ['enterItem']);
    });

    it('should not add item when pressing Enter with empty input', () => {
      const onPropertyChange = vi.fn();
      renderField({}, onPropertyChange);
      const input = getInput();

      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(onPropertyChange).not.toHaveBeenCalled();
    });
  });

  describe('Remove Functionality', () => {
    it('should remove specific item when clicking close button', () => {
      const onPropertyChange = vi.fn();
      renderField({ [PROP_NAME]: ['item1', 'item2', 'item3'] }, onPropertyChange);

      const closeButtons = screen.getAllByRole('button', { name: /clear filter|close/i });
      fireEvent.click(closeButtons[1]); // Remove 'item2'

      expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, ['item1', 'item3']);
    });
  });

  describe('Clear All Functionality', () => {
    it('should clear all items when clicking Clear all', () => {
      const onPropertyChange = vi.fn();
      renderField({ [PROP_NAME]: ['item1', 'item2', 'item3'] }, onPropertyChange);

      fireEvent.click(getClearAllButton());

      expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, []);
    });

    it('should enable the Clear all button only when the array has items', () => {
      const { unmount } = renderField();

      expect(getClearAllButton()).toBeDisabled();

      unmount();
      renderField({ [PROP_NAME]: ['item1'] });

      expect(getClearAllButton()).not.toBeDisabled();
    });
  });
});
