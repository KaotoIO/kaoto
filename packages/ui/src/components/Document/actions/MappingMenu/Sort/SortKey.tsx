import { FunctionMath, Help, SettingsAdjust, SortAscending, SortDescending } from '@carbon/icons-react';
import { Toggletip, ToggletipButton, ToggletipContent } from '@carbon/react';
import {
  Button,
  FormGroup,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  TextInput,
} from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent, Ref, useCallback, useMemo, useRef, useState } from 'react';

import {
  ForEachGroupItem,
  ForEachItem,
  SortItem,
  ValueSelector,
  ValueType,
} from '../../../../../models/datamapper/mapping';
import { LANG_OPTIONS } from '../../../../../models/datamapper/types';
import { XPathEditorModal } from '../../../../XPath/XPathEditorModal';
import { TypeaheadInput, TypeaheadInputOption } from '../../TypeaheadInput';
import { useSortKeyItems } from './useSortKeyItems';

const DATA_TYPE_OPTIONS: TypeaheadInputOption[] = [
  { value: 'text', description: 'Sort as text (default)' },
  { value: 'number', description: 'Sort as number' },
];

const LANG_INPUT_OPTIONS: TypeaheadInputOption[] = LANG_OPTIONS.map((opt) => ({
  value: opt.id,
  description: opt.displayName,
}));

interface SortKeyProps {
  index: number;
  sortItem: SortItem;
  mapping: ForEachItem | ForEachGroupItem;
  onChange: (index: number, sortItem: SortItem) => void;
  onRemove: (index: number) => void;
}

export const SortKey: FunctionComponent<SortKeyProps> = ({ index, sortItem, mapping, onChange, onRemove }) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isCaseOrderOpen, setIsCaseOrderOpen] = useState(false);
  const [isStableOpen, setIsStableOpen] = useState(false);

  const position = index + 1;
  const sortKeyItems = useSortKeyItems(mapping);

  const options: TypeaheadInputOption[] = useMemo(
    () => sortKeyItems.map((opt) => ({ value: opt.xpath, description: opt.description })),
    [sortKeyItems],
  );

  const handleChange = useCallback(
    (value: string) => {
      const cloned = sortItem.clone();
      cloned.expression = value;
      onChange(index, cloned);
    },
    [index, sortItem, onChange],
  );

  const [isXpathEditorOpen, setIsXpathEditorOpen] = useState(false);
  const xpathProxyRef = useRef<ValueSelector | null>(null);

  const handleOpenXPathEditor = useCallback(() => {
    const proxy = new ValueSelector(mapping, ValueType.VALUE);
    proxy.expression = sortItem.expression;
    xpathProxyRef.current = proxy;
    setIsXpathEditorOpen(true);
  }, [mapping, sortItem.expression]);

  const handleXPathUpdate = useCallback(() => {
    if (!xpathProxyRef.current) return;
    const cloned = sortItem.clone();
    cloned.expression = xpathProxyRef.current.expression;
    onChange(index, cloned);
  }, [index, sortItem, onChange]);

  const handleXPathClose = useCallback(() => {
    xpathProxyRef.current = null;
    setIsXpathEditorOpen(false);
  }, []);

  const handleAdvancedChange = useCallback(
    (field: 'lang' | 'dataType' | 'caseOrder' | 'collation' | 'stable', value: string) => {
      const cloned = sortItem.clone();
      (cloned[field] as string) = value;
      onChange(index, cloned);
    },
    [index, sortItem, onChange],
  );

  const caseOrderToggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsCaseOrderOpen((prev) => !prev)}
        isExpanded={isCaseOrderOpen}
        isFullWidth
        data-testid={`sort-case-order-toggle-${index}`}
      >
        {sortItem.caseOrder || '(none)'}
      </MenuToggle>
    ),
    [isCaseOrderOpen, sortItem.caseOrder, index],
  );

  const stableToggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsStableOpen((prev) => !prev)}
        isExpanded={isStableOpen}
        isFullWidth
        data-testid={`sort-stable-toggle-${index}`}
      >
        {sortItem.stable || '(none)'}
      </MenuToggle>
    ),
    [isStableOpen, sortItem.stable, index],
  );

  return (
    <>
      <div className="sort-modal__row">
        <Button
          variant="plain"
          aria-label={`Sort order ${position}: ${sortItem.order}`}
          data-testid={`sort-order-${index}`}
          title={sortItem.order === 'ascending' ? 'Ascending' : 'Descending'}
          onClick={() => {
            const cloned = sortItem.clone();
            cloned.order = cloned.order === 'ascending' ? 'descending' : 'ascending';
            onChange(index, cloned);
          }}
          icon={sortItem.order === 'ascending' ? <SortAscending /> : <SortDescending />}
        />
        <TypeaheadInput
          value={sortItem.expression}
          onChange={handleChange}
          options={options}
          id={`sort-expression-${index}`}
          data-testid={`sort-expression-${index}`}
          placeholder="XPath expression"
          ariaLabel={`Sort expression ${position}`}
          className="sort-modal__expression"
        />
        <Button
          variant="plain"
          aria-label={`Edit XPath for sort key ${position}`}
          data-testid={`sort-edit-xpath-${index}`}
          title="Edit XPath"
          onClick={handleOpenXPathEditor}
          icon={<FunctionMath />}
        />
        <Button
          variant="plain"
          aria-label={`Advanced properties for sort key ${position}`}
          data-testid={`sort-advanced-${index}`}
          title="Advanced properties"
          onClick={() => setIsAdvancedOpen((prev) => !prev)}
          className={
            clsx(
              isAdvancedOpen && 'sort-modal__settings-active',
              sortItem.hasAdvancedProperties() && 'sort-modal__settings-configured',
            ) || undefined
          }
          icon={<SettingsAdjust />}
        />
        <Button
          variant="plain"
          aria-label={`Remove sort key ${position}`}
          data-testid={`sort-remove-${index}`}
          onClick={() => onRemove(index)}
          icon={<TrashIcon />}
        />
        {isXpathEditorOpen && xpathProxyRef.current && (
          <XPathEditorModal
            isOpen
            title={`Sort key ${position}`}
            mapping={xpathProxyRef.current}
            onClose={handleXPathClose}
            onUpdate={handleXPathUpdate}
          />
        )}
      </div>
      {isAdvancedOpen && (
        <div className="sort-modal__advanced" data-testid={`sort-advanced-panel-${index}`}>
          <FormGroup
            label="Language"
            fieldId={`sort-lang-${index}`}
            labelHelp={
              <Toggletip>
                <ToggletipButton label="Language help">
                  <Help />
                </ToggletipButton>
                <ToggletipContent>
                  BCP 47 language tag for sort collation. When empty, the system default language is used.
                </ToggletipContent>
              </Toggletip>
            }
          >
            <TypeaheadInput
              value={sortItem.lang}
              onChange={(value) => handleAdvancedChange('lang', value)}
              options={LANG_INPUT_OPTIONS}
              id={`sort-lang-${index}`}
              data-testid={`sort-lang-${index}`}
              placeholder="System default"
              ariaLabel={`Language for sort key ${position}`}
            />
          </FormGroup>
          <FormGroup
            label="Data type"
            fieldId={`sort-data-type-${index}`}
            labelHelp={
              <Toggletip>
                <ToggletipButton label="Data type help">
                  <Help />
                </ToggletipButton>
                <ToggletipContent>
                  Controls how values are compared: as text strings, numbers, or a namespace-qualified type (e.g.
                  xs:date).
                </ToggletipContent>
              </Toggletip>
            }
          >
            <TypeaheadInput
              value={sortItem.dataType}
              onChange={(value) => handleAdvancedChange('dataType', value)}
              options={DATA_TYPE_OPTIONS}
              id={`sort-data-type-${index}`}
              data-testid={`sort-data-type-${index}`}
              placeholder="text (default)"
              ariaLabel={`Data type for sort key ${position}`}
            />
          </FormGroup>
          <FormGroup
            label="Case order"
            fieldId={`sort-case-order-${index}`}
            labelHelp={
              <Toggletip>
                <ToggletipButton label="Case order help">
                  <Help />
                </ToggletipButton>
                <ToggletipContent>
                  Whether uppercase or lowercase letters sort first. Only meaningful for text data type.
                </ToggletipContent>
              </Toggletip>
            }
          >
            <Select
              id={`sort-case-order-${index}`}
              isOpen={isCaseOrderOpen}
              selected={sortItem.caseOrder}
              onSelect={(_event, value) => {
                handleAdvancedChange('caseOrder', (value as string) || '');
                setIsCaseOrderOpen(false);
              }}
              onOpenChange={setIsCaseOrderOpen}
              toggle={caseOrderToggle}
              data-testid={`sort-case-order-${index}`}
            >
              <SelectList>
                <SelectOption value="">(none)</SelectOption>
                <SelectOption value="upper-first">upper-first</SelectOption>
                <SelectOption value="lower-first">lower-first</SelectOption>
              </SelectList>
            </Select>
          </FormGroup>
          <FormGroup
            label="Stable"
            fieldId={`sort-stable-${index}`}
            labelHelp={
              <Toggletip>
                <ToggletipButton label="Stable help">
                  <Help />
                </ToggletipButton>
                <ToggletipContent>Whether to preserve the original order of items that compare equal.</ToggletipContent>
              </Toggletip>
            }
          >
            <Select
              id={`sort-stable-${index}`}
              isOpen={isStableOpen}
              selected={sortItem.stable}
              onSelect={(_event, value) => {
                handleAdvancedChange('stable', (value as string) || '');
                setIsStableOpen(false);
              }}
              onOpenChange={setIsStableOpen}
              toggle={stableToggle}
              data-testid={`sort-stable-${index}`}
            >
              <SelectList>
                <SelectOption value="">(none)</SelectOption>
                <SelectOption value="yes">yes</SelectOption>
                <SelectOption value="no">no</SelectOption>
              </SelectList>
            </Select>
          </FormGroup>
          <FormGroup
            label="Collation"
            fieldId={`sort-collation-${index}`}
            className="sort-modal__advanced-collation"
            labelHelp={
              <Toggletip>
                <ToggletipButton label="Collation help">
                  <Help />
                </ToggletipButton>
                <ToggletipContent>URI identifying the collation to use for string comparison.</ToggletipContent>
              </Toggletip>
            }
          >
            <TextInput
              id={`sort-collation-${index}`}
              data-testid={`sort-collation-${index}`}
              value={sortItem.collation}
              onChange={(_event, value) => handleAdvancedChange('collation', value)}
              placeholder="Collation URI"
              aria-label={`Collation for sort key ${position}`}
            />
          </FormGroup>
        </div>
      )}
    </>
  );
};
