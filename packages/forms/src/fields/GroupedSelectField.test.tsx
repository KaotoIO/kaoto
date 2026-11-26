import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ModelContextProvider, SchemaProvider } from '../providers';
import { GroupedSelectField, GroupedSelectOptionGroup } from './GroupedSelectField';

describe('GroupedSelectField', () => {
  const PROP_NAME = 'runtime';
  const mockSchema = {
    title: 'Runtime',
    description: 'Pick a runtime',
    type: 'string' as const,
  };

  const groups: GroupedSelectOptionGroup[] = [
    {
      label: 'Main',
      icon: <i data-testid="icon-main" />,
      options: [
        { value: 'main-1', label: 'Camel Main 4.14.5', icon: <i data-testid="icon-main-1" /> },
        { value: 'main-2', label: 'Camel Main 4.15.0' },
      ],
    },
    {
      label: 'Quarkus',
      options: [{ value: 'quarkus-1', label: 'Camel Quarkus 3.8.0' }],
    },
  ];

  const renderField = (
    props: Partial<React.ComponentProps<typeof GroupedSelectField>> = {},
    model: Record<string, unknown> = {},
    onPropertyChange = vi.fn(),
  ) =>
    render(
      <ModelContextProvider model={model} onPropertyChange={onPropertyChange}>
        <SchemaProvider schema={mockSchema}>
          <GroupedSelectField propName={PROP_NAME} groups={groups} {...props} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

  const openDropdown = (testId = `${PROP_NAME}-grouped-select-toggle`) => {
    fireEvent.click(within(screen.getByTestId(testId)).getByRole('combobox'));
  };

  /** Group headers are rendered as disabled options, so they are visible but not selectable. */
  const getGroupHeader = (name: string) =>
    screen.queryAllByRole('option').find((option) => option.textContent?.trim() === name) ?? null;

  it('should render the field title from the schema', () => {
    const { container } = renderField();

    expect(container.querySelector('label')).toHaveTextContent('Runtime');
  });

  /*
   * `aria-disabled` is the one assertion worth making about a header: it is what stops the header
   * being selectable, and Carbon forwards the same flag to downshift, so it is also what makes
   * arrow-key navigation and type-ahead skip it. Keyboard access rides on this.
   */
  it('should render each group header as a disabled, unselectable row', () => {
    renderField();
    openDropdown();

    expect(getGroupHeader('Main')).toHaveAttribute('aria-disabled', 'true');
    expect(getGroupHeader('Quarkus')).toHaveAttribute('aria-disabled', 'true');
  });

  /*
   * The arrow keys are what the `aria-disabled` above buys: Carbon forwards the flag to downshift,
   * which keeps the headers out of the keyboard order. Pinning the behaviour itself, rather than
   * only the attribute, is what would catch a Carbon release that stops forwarding it.
   */
  it('should skip the group headers with the arrow keys', async () => {
    const user = userEvent.setup();
    const onPropertyChange = vi.fn();
    renderField({}, {}, onPropertyChange);

    const combobox = within(screen.getByTestId(`${PROP_NAME}-grouped-select-toggle`)).getByRole('combobox');
    const getActiveOption = () => document.getElementById(combobox.getAttribute('aria-activedescendant') ?? '');
    combobox.focus();

    // Opens the menu, then walks past the `Main` header onto its first option.
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(getActiveOption()).toHaveTextContent('Camel Main 4.14.5');

    // Past the last `Main` option, the `Quarkus` header is skipped too.
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(getActiveOption()).toHaveTextContent('Camel Quarkus 3.8.0');

    await user.keyboard('{ArrowUp}{Enter}');
    expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, 'main-2');
  });

  it('should render every option of every group', () => {
    renderField();
    openDropdown();

    expect(screen.getByRole('option', { name: 'Camel Main 4.14.5' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Camel Main 4.15.0' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Camel Quarkus 3.8.0' })).toBeInTheDocument();
  });

  it('should give two groups sharing a label distinct header rows', () => {
    renderField({
      groups: [
        { label: 'Main', options: [{ value: 'a', label: 'Catalog A' }] },
        { label: 'Main', options: [{ value: 'b', label: 'Catalog B' }] },
      ],
    });
    openDropdown();

    const ids = screen
      .queryAllByRole('option')
      .filter((option) => option.textContent?.trim() === 'Main')
      .map((option) => option.id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('should call onPropertyChange with the option id when an option is picked', () => {
    const onPropertyChange = vi.fn();
    renderField({}, {}, onPropertyChange);

    openDropdown();
    fireEvent.click(screen.getByRole('option', { name: 'Camel Quarkus 3.8.0' }));

    expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, 'quarkus-1');
  });

  it('should not call onPropertyChange when a group header is clicked', () => {
    const onPropertyChange = vi.fn();
    renderField({}, {}, onPropertyChange);

    openDropdown();
    fireEvent.click(getGroupHeader('Quarkus')!);

    expect(onPropertyChange).not.toHaveBeenCalled();
  });

  it('should select fallbackValue when the model holds no value', () => {
    renderField({ fallbackValue: 'main-2' });

    expect(screen.getByTestId(`${PROP_NAME}-grouped-select-toggle`)).toHaveTextContent('Camel Main 4.15.0');
  });

  it('should prefer the stored value over fallbackValue', () => {
    renderField({ fallbackValue: 'main-2' }, { [PROP_NAME]: 'quarkus-1' });

    expect(screen.getByTestId(`${PROP_NAME}-grouped-select-toggle`)).toHaveTextContent('Camel Quarkus 3.8.0');
  });

  it('should render loadingText instead of the dropdown while groups is undefined', () => {
    renderField({ groups: undefined, loadingText: 'Loading catalogs...' });

    expect(screen.getByText('Loading catalogs...')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should render an empty dropdown when groups is empty', () => {
    renderField({ groups: [] });
    openDropdown();

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('should render the group icon in its header row', () => {
    renderField();
    openDropdown();

    expect(within(getGroupHeader('Main')!).getByTestId('icon-main')).toBeInTheDocument();
  });

  it('should render the selected option icon in the toggle', () => {
    renderField({}, { [PROP_NAME]: 'main-1' });

    expect(
      within(screen.getByTestId(`${PROP_NAME}-grouped-select-toggle`)).getByTestId('icon-main-1'),
    ).toBeInTheDocument();
  });

  it('should use the data-testid it is given', () => {
    renderField({ 'data-testid': 'custom-toggle' });

    expect(screen.getByTestId('custom-toggle')).toBeInTheDocument();
  });

  it('should be disabled when disabled is true in context', () => {
    render(
      <ModelContextProvider model={{}} onPropertyChange={vi.fn()} disabled>
        <SchemaProvider schema={mockSchema}>
          <GroupedSelectField propName={PROP_NAME} groups={groups} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    expect(within(screen.getByTestId(`${PROP_NAME}-grouped-select-toggle`)).getByRole('combobox')).toBeDisabled();
  });

  it('should render placeholder as the dropdown label when nothing is selected', () => {
    renderField({ placeholder: 'Select a runtime' });

    expect(screen.getByText('Select a runtime')).toBeInTheDocument();
  });

  it('should mark the selected option as active in the open dropdown menu', () => {
    renderField({}, { [PROP_NAME]: 'main-2' });
    openDropdown();

    const selectedOption = screen.getByRole('option', { name: 'Camel Main 4.15.0' });
    expect(selectedOption).toHaveClass('cds--list-box__menu-item--active');
  });

  describe('Accessibility', () => {
    it("should name the combobox after the schema title, not after the field's current value", () => {
      renderField({}, { [PROP_NAME]: 'main-1' });

      // Without a `titleText`, Carbon renders no label and the accessible name falls back to the
      // `title` attribute, which holds the selected value.
      expect(screen.getByRole('combobox', { name: 'Runtime' })).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Camel Main 4.14.5' })).not.toBeInTheDocument();
    });

    it('should let a caller override the accessible name with aria-label', () => {
      renderField({ 'aria-label': 'Integrations runtime version' });

      expect(screen.getByRole('combobox', { name: 'Integrations runtime version' })).toBeInTheDocument();
    });

    it('should fall back to the property name when the schema title is empty', () => {
      render(
        <ModelContextProvider model={{}} onPropertyChange={vi.fn()}>
          <SchemaProvider schema={{ title: '', type: 'string' as const }}>
            <GroupedSelectField propName={PROP_NAME} groups={groups} />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      // An empty title would leave Carbon without a label, and the name back on the current value.
      expect(screen.getByRole('combobox', { name: PROP_NAME })).toBeInTheDocument();
    });

    it('should fall back to the property name when the schema has no title', () => {
      render(
        <ModelContextProvider model={{}} onPropertyChange={vi.fn()}>
          <SchemaProvider schema={{ type: 'string' as const }}>
            <GroupedSelectField propName="#.runtimeCatalogName" groups={groups} />
          </SchemaProvider>
        </ModelContextProvider>,
      );

      expect(screen.getByRole('combobox', { name: 'runtimeCatalogName' })).toBeInTheDocument();
    });

    it('should keep the accessible name out of the visual layout', () => {
      const { container } = renderField();

      // FieldWrapper already shows the label; this one exists only for assistive technology.
      expect(container.querySelector('label.cds--visually-hidden')).toHaveTextContent('Runtime');
    });
  });
});
