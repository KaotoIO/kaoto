import { fireEvent, Screen, waitFor } from '@testing-library/dom';

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
    const requiredTab = await this.findTab('Required');
    await this.executor(async () => {
      fireEvent.click(requiredTab);
    });
  }

  /**
   * Shows the all fields tab.
   */
  async showAllFields(): Promise<void> {
    const allTab = await this.findTab('All');
    await this.executor(async () => {
      fireEvent.click(allTab);
    });
  }

  /**
   * Shows the modified fields tab.
   */
  async showModifiedFields(): Promise<void> {
    const modifiedTab = await this.findTab('Modified');
    await this.executor(async () => {
      fireEvent.click(modifiedTab);
    });
  }

  private async findTab(name: 'Required' | 'All' | 'Modified'): Promise<HTMLElement> {
    const tabByTestId = this.screen.queryByTestId(`tab-${name}`);
    if (tabByTestId) {
      return tabByTestId;
    }

    const tabs = (await this.screen.queryAllByRole('tab', { name })) ?? [];
    if (tabs.length > 0) {
      return tabs[0];
    }

    const buttons = await this.screen.findAllByRole('button', { name });
    return buttons[0];
  }

  getExpressionInputForProperty(propertyName: string): HTMLElement | null {
    return this.screen.queryByTestId(`${propertyName}__expression-list`);
  }

  async findExpressionInputForProperty(propertyName: string): Promise<HTMLElement> {
    return this.screen.findByTestId(`${propertyName}__expression-list`);
  }

  getOneOfInputForProperty(propertyName: string): HTMLElement | null {
    return this.screen.queryByTestId(`${propertyName}__oneof-list`);
  }

  async findOneOfInputForProperty(propertyName: string): Promise<HTMLElement> {
    return this.screen.findByTestId(`${propertyName}__oneof-list`);
  }

  getTypeaheadInputForProperty(propertyName: string): HTMLElement | null {
    return this.screen.queryByTestId(propertyName);
  }

  async findTypeaheadInputForProperty(propertyName: string): Promise<HTMLElement> {
    return this.screen.findByTestId(propertyName);
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
    const fieldWrappers = this.screen.queryAllByTestId(/__field-wrapper$/);
    const wrappedFields = fieldWrappers
      .filter(
        (wrapper) =>
          wrapper
            .querySelector(':scope > .kaoto-field-wrapper__label-container > .kaoto-field-wrapper__label')
            ?.lastChild?.textContent?.trim() === name,
      )
      .map((wrapper) => wrapper.querySelector<HTMLElement>('[role="textbox"], [role="combobox"]'))
      .filter(isDefined);

    if (typeof index === 'number') {
      return (
        this.screen.queryAllByRole('textbox', { name })[index] ??
        this.screen.queryAllByRole('combobox', { name })[index] ??
        wrappedFields[index] ??
        null
      );
    }

    return (
      this.screen.queryByRole('textbox', { name }) ??
      this.screen.queryByRole('combobox', { name }) ??
      wrappedFields[0] ??
      null
    );
  }

  async findFieldByDisplayName(name: string, index?: number): Promise<HTMLElement> {
    return waitFor(() => {
      const field = this.getFieldByDisplayName(name, index);
      if (!isDefined(field)) {
        throw new Error(`Input field for property "${name}" not found.`);
      }
      return field;
    });
  }

  /**
   * Selects the specified item from the typeahead list.
   * @param itemName lowercase name of the item, f.i. "simple"
   */
  async selectTypeaheadItem(itemName: string): Promise<void> {
    const options = await this.screen.findAllByRole('option');
    const expectedName = itemName === 'create-new-with-name' ? 'create new' : itemName.toLowerCase();
    const optionItem = options.find((option) => option.textContent?.trim().toLowerCase().startsWith(expectedName));
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
    const inputField = await this.findFieldByDisplayName(name, options.index);

    await this.executor(async () => {
      fireEvent.input(inputField, { target: { value: text } });
    });
  }

  /**
   * Toggles the expression field for the specified property.
   * @param propertyName The name of the property, starting with `#` (f.i. `#.expression`)
   */
  async toggleExpressionFieldForProperty(propertyName: string): Promise<void> {
    const expressionField = await this.findExpressionInputForProperty(propertyName);

    await this.executor(async () => {
      fireEvent.click(expressionField);
    });
  }

  /**
   * Toggles the oneOf field for the specified property.
   * @param propertyName The name of the property, starting with `#` (f.i. `#`)
   */
  async toggleOneOfFieldForProperty(propertyName: string): Promise<void> {
    const oneOfField = await this.findOneOfInputForProperty(propertyName);

    await this.executor(async () => {
      fireEvent.click(oneOfField);
    });
  }

  /**
   * Toggles the oneOf field for the specified property.
   * @param propertyName The name of the property, starting with `#` (f.i. `#`)
   */
  async toggleTypeaheadFieldForProperty(propertyName: string): Promise<void> {
    const typeaheadInput = await this.findTypeaheadInputForProperty(propertyName);
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
    const input = await this.screen.findByTestId(propertyName);
    await this.clickClearButton(input, propertyName);
  }

  async clearExpressionFieldForProperty(propertyName: string): Promise<void> {
    const input = await this.findExpressionInputForProperty(propertyName);
    await this.clickClearButton(input, propertyName);
  }

  async clearTextFieldForProperty(propertyName: string): Promise<void> {
    const fieldActions = await this.screen.findByTestId(`${propertyName}__field-actions`);
    await this.executor(async () => {
      fireEvent.click(fieldActions);
    });

    const clearButton = await this.screen.findByTestId(`${propertyName}__clear`);
    await this.executor(async () => {
      fireEvent.click(clearButton);
    });
  }

  /**
   * Returns the URI field for the specified property name.
   */
  getUriInputForProperty(propertyName: string): HTMLInputElement | null {
    return this.screen.queryByTestId(propertyName) as HTMLInputElement | null;
  }

  /**
   * Finds the URI field for the specified property name.
   */
  async findUriInputForProperty(propertyName: string): Promise<HTMLInputElement> {
    return (await this.screen.findByTestId(propertyName)) as HTMLInputElement;
  }

  /**
   * Clicks the Edit button on a URI field.
   */
  async editUriForProperty(propertyName: string): Promise<void> {
    const editButton = await this.screen.findByTestId(`${propertyName}--edit`);
    await this.executor(async () => {
      fireEvent.click(editButton);
    });
  }

  /**
   * Saves the edit on a URI field.
   */
  async saveUriForProperty(propertyName: string): Promise<void> {
    const saveButton = await this.screen.findByTestId(`${propertyName}--save`);
    await this.executor(async () => {
      fireEvent.click(saveButton);
    });
  }

  /**
   * Cancels the edit on a URI field.
   */
  async cancelUriForProperty(propertyName: string): Promise<void> {
    const cancelButton = await this.screen.findByTestId(`${propertyName}--cancel`);
    await this.executor(async () => {
      fireEvent.click(cancelButton);
    });
  }

  private async clickClearButton(input: HTMLElement, propertyName: string): Promise<void> {
    const clearButton = input.parentElement?.querySelector<HTMLElement>('button[aria-label="Clear selected item"]');
    if (!isDefined(clearButton)) {
      throw new Error(`Clear button for property "${propertyName}" not found.`);
    }

    await this.executor(async () => {
      fireEvent.click(clearButton);
    });
  }
}
