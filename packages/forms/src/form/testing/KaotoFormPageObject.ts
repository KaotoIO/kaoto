import { fireEvent, Screen } from '@testing-library/dom';
import { isDefined } from '../utils';

export class KaotoFormPageObject {
  constructor(
    private readonly screen: Screen,
    private readonly executor: (callback: () => Promise<void>) => Promise<void>,
  ) {}

  /**
   * Shows the required fields tab.
   */
  async showRequiredFields(): Promise<void> {
    const [requiredTab] = this.screen.getAllByRole('button', { name: 'Required' });
    await this.executor(async () => {
      fireEvent.click(requiredTab);
    });
  }

  /**
   * Shows the all fields tab.
   */
  async showAllFields(): Promise<void> {
    const [allTab] = this.screen.getAllByRole('button', { name: 'All' });
    await this.executor(async () => {
      fireEvent.click(allTab);
    });
  }

  /**
   * Shows the modified fields tab.
   */
  async showModifiedFields(): Promise<void> {
    const [modifiedTab] = this.screen.getAllByRole('button', { name: 'Modified' });
    await this.executor(async () => {
      fireEvent.click(modifiedTab);
    });
  }

  getExpressionInputForProperty(propertyName: string): HTMLElement | null {
    return this.screen.queryByTestId(`${propertyName}__expression-list-typeahead-select-input`);
  }

  getOneOfInputForProperty(propertyName: string): HTMLElement | null {
    return this.screen.queryByTestId(`${propertyName}__oneof-list-typeahead-select-input`);
  }

  getTypeaheadInputForProperty(propertyName: string): HTMLElement | null {
    return this.screen.queryByTestId(`${propertyName}-typeahead-select-input`);
  }

  getSetObjectButtonForProperty(propertyName: string): HTMLElement | null {
    return this.screen.queryByTestId(`${propertyName}__set`);
  }

  getRemoveObjectButtonForProperty(propertyName: string): HTMLElement | null {
    return this.screen.queryByTestId(`${propertyName}__remove`);
  }

  /**
   * Returns the field by its display name.
   * @param name The display name of the field. f.i. "Variable Receive"
   * @param index The index of the field if there are multiple fields with the same name.
   * @returns The field element or null if not found.
   */
  getFieldByDisplayName(name: string, index?: number): HTMLElement | null {
    if (typeof index === 'number') {
      return this.screen.queryAllByRole('textbox', { name })[index];
    }

    return this.screen.queryByRole('textbox', { name });
  }

  /**
   * Selects the specified item from the typeahead list.
   * @param itemName lowercase name of the item, f.i. "simple"
   */
  async selectTypeaheadItem(itemName: string): Promise<void> {
    const optionItem = this.screen.queryByRole('option', { name: `option ${itemName}` });
    if (!isDefined(optionItem)) {
      throw new Error(`Option ${itemName} not found.`);
    }

    await this.executor(async () => {
      fireEvent.click(optionItem);
    });
  }

  /**
   * Inputs text into the specified property.
   * @param name The display name of the field. f.i. "Variable Receive"
   * @param text The text to input.
   */
  async inputText(name: string, text: string, options: Partial<{ index?: number }> = {}): Promise<void> {
    const inputField = this.getFieldByDisplayName(name, options.index);

    if (!isDefined(inputField)) {
      throw new Error(`Input field for property "${name}" not found.`);
    }

    await this.executor(async () => {
      fireEvent.input(inputField, { target: { value: text } });
    });
  }

  /**
   * Toggles the expression field for the specified property.
   * @param propertyName The name of the property, starting with `#` (f.i. `#.expression`)
   */
  async toggleExpressionFieldForProperty(propertyName: string): Promise<void> {
    const expressionField = this.getExpressionInputForProperty(propertyName);
    if (!isDefined(expressionField)) {
      throw new Error(`Expression field for property "${propertyName}" not found.`);
    }

    await this.executor(async () => {
      fireEvent.click(expressionField);
    });
  }

  /**
   * Toggles the oneOf field for the specified property.
   * @param propertyName The name of the property, starting with `#` (f.i. `#`)
   */
  async toggleOneOfFieldForProperty(propertyName: string): Promise<void> {
    const oneOfField = this.getOneOfInputForProperty(propertyName);
    if (!isDefined(oneOfField)) {
      throw new Error(`OneOf field for property "${propertyName}" not found.`);
    }

    await this.executor(async () => {
      fireEvent.click(oneOfField);
    });
  }

  /**
   * Toggles the oneOf field for the specified property.
   * @param propertyName The name of the property, starting with `#` (f.i. `#`)
   */
  async toggleTypeaheadFieldForProperty(propertyName: string): Promise<void> {
    const typeaheadInput = this.getTypeaheadInputForProperty(propertyName);
    if (!isDefined(typeaheadInput)) {
      throw new Error(`Typeahead input field for property "${propertyName}" not found.`);
    }

    await this.executor(async () => {
      fireEvent.click(typeaheadInput);
    });
  }

  /**
   * Clicks the "Set object" button for the specified property.
   * @param propertyName The name of the property, starting with `#` (f.i. `#.barcode`)
   */
  async setObjectForProperty(propertyName: string): Promise<void> {
    const setObjectButton = this.getSetObjectButtonForProperty(propertyName);
    if (!isDefined(setObjectButton)) {
      throw new Error(`SetObject button for property "${propertyName}" not found.`);
    }

    await this.executor(async () => {
      fireEvent.click(setObjectButton);
    });
  }

  /**
   * Clicks the "Clear" button for the specified property.
   * @param propertyName The name of the property, starting with `#` (f.i. `#.barcode`)
   */
  async clearForProperty(propertyName: string): Promise<void> {
    const clearButton = this.screen.queryByTestId(`${propertyName}__clear`);
    if (!isDefined(clearButton)) {
      throw new Error(`Clear button for property "${propertyName}" not found.`);
    }

    await this.executor(async () => {
      fireEvent.click(clearButton);
    });
  }
}
