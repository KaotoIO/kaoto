import './GroupedSelectField.scss';

import { Dropdown } from '@carbon/react';
import { FunctionComponent, ReactNode, useContext, useMemo } from 'react';

import { useFieldValue } from '../hooks/field-value';
import { FieldProps } from '../models/typings';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldWrapper } from './FieldWrapper';

export interface GroupedSelectOption {
  /** Written to the model when the option is picked. */
  value: string;
  label: string;
  /** Shown in the toggle while this option is selected. Not shown in the list. */
  icon?: ReactNode;
}

export interface GroupedSelectOptionGroup {
  label: string;
  /** Shown in the group's header row. */
  icon?: ReactNode;
  options: GroupedSelectOption[];
}

export interface GroupedSelectFieldProps extends FieldProps {
  /** `undefined` while the host is still loading them — the field shows `loadingText` instead. */
  groups?: GroupedSelectOptionGroup[];
  /** Option value to select when the model holds no value. */
  fallbackValue?: string;
  /** Dropdown label while nothing is selected. */
  placeholder?: string;
  /** Replaces the dropdown while `groups` is `undefined`. */
  loadingText?: string;
}

/**
 * One row of the Carbon `Dropdown`. Headers are rows too: `disabled` is what stops them being
 * picked, and Carbon also forwards it to downshift, which is what makes arrow-key navigation and
 * type-ahead skip them. `isGroupHeader` carries the meaning; `disabled` is how Carbon reads it.
 */
interface GroupedSelectRow {
  value: string;
  label: string;
  icon?: ReactNode;
  isGroupHeader: boolean;
  disabled: boolean;
}

/**
 * Flattens the groups into the single list Carbon's `Dropdown` takes, header row first.
 * Header values are suffixed with the group's position so that two groups sharing a label cannot
 * produce duplicate values.
 */
const getRowsFromGroups = (groups: GroupedSelectOptionGroup[]): GroupedSelectRow[] =>
  groups.flatMap((group, groupIndex) => [
    {
      value: `__group__${groupIndex}__${group.label}`,
      label: group.label,
      icon: group.icon,
      isGroupHeader: true,
      disabled: true,
    },
    ...group.options.map((option) => ({ ...option, isGroupHeader: false, disabled: false })),
  ]);

const renderRow = (row: GroupedSelectRow) =>
  row.isGroupHeader ? (
    <span className="grouped-select-field-group-header">
      {row.icon} {row.label}
    </span>
  ) : (
    <span className="grouped-select-field-option">{row.label}</span>
  );

const renderSelectedOption = (row: GroupedSelectRow) => (
  <span className="grouped-select-field-selected">
    {row.icon}
    <span>{row.label}</span>
  </span>
);

/**
 * A select field whose options are shown under group headers.
 *
 * Carbon's `Dropdown` has no native grouping, so headers are rendered as disabled rows: visible,
 * but not selectable. Entirely presentational — the host supplies the groups, the icons and the
 * fallback, so this field needs no knowledge of where they come from.
 */
export const GroupedSelectField: FunctionComponent<GroupedSelectFieldProps> = ({
  propName,
  required,
  groups,
  fallbackValue,
  placeholder = '',
  loadingText = 'Loading…',
  'data-testid': dataTestId = `${propName}-grouped-select-toggle`,
  'aria-label': ariaLabel,
}) => {
  const { schema } = useContext(SchemaContext);
  const { value: storedValue, onChange, disabled } = useFieldValue<string | undefined>(propName);

  /*
   * Carbon only renders the `<label>` that names the combobox when `titleText` is truthy, and
   * `FieldWrapper`'s visible label is associated with no control. Without a name here, the
   * accessible name falls back to the `title` attribute, which Carbon sets to the *current value* —
   * so a screen reader announces the selected option instead of the field it belongs to.
   * `hideLabel` keeps that label out of the visual layout, where FieldWrapper already shows it.
   *
   * `aria-label`, when a caller passes one, feeds the same label rather than becoming a literal
   * `aria-label` attribute: a real `<label>` tied to the control by `for`/`id` is the stronger
   * association, and the resulting accessible name is identical. `||` rather than `??`, because an
   * empty title leaves Carbon without a label exactly as a missing one does.
   */
  const accessibleName = ariaLabel || schema.title || propName.slice(propName.lastIndexOf('.') + 1);

  const rows = useMemo(() => getRowsFromGroups(groups ?? []), [groups]);
  const valueToSelect = storedValue || fallbackValue;

  /*
   * Must search the very array handed to `items`: Carbon marks the active row by reference
   * (`selectedItem === item`), so a copy would lose the checkmark and the active state.
   */
  const selectedRow = useMemo(
    () => rows.find((row) => !row.isGroupHeader && row.value === valueToSelect),
    [rows, valueToSelect],
  );

  /*
   * Neither guard can fire today: a `Dropdown` has no way to clear its selection, so Carbon never
   * reports `null`, and downshift skips the disabled header rows for clicks as much as for the
   * keyboard. They are kept as the contract Carbon's nullable type states, hence the ignore.
   */
  const handleChange = ({ selectedItem }: { selectedItem: GroupedSelectRow | null }) => {
    /* v8 ignore next */
    if (!selectedItem || selectedItem.isGroupHeader) return;
    onChange(selectedItem.value);
  };

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="string"
      description={schema.description}
    >
      {groups === undefined ? (
        /*
         * Deliberately not a live region: this element mounts together with its text, and a region
         * is announced only when its content changes while it is already in the accessibility
         * tree, so `role="status"` would announce nothing. Revisit if `groups` ever changes in
         * place rather than the field being remounted.
         */
        <div>{loadingText}</div>
      ) : (
        <Dropdown
          id={`${propName}-grouped-select`}
          titleText={accessibleName}
          hideLabel
          label={placeholder}
          items={rows}
          itemToElement={renderRow}
          renderSelectedItem={renderSelectedOption}
          selectedItem={selectedRow}
          disabled={disabled}
          data-testid={dataTestId}
          onChange={handleChange}
        />
      )}
    </FieldWrapper>
  );
};
