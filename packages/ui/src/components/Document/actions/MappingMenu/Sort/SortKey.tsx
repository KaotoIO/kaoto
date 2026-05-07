import { FunctionMath, SortAscending, SortDescending } from '@carbon/icons-react';
import { Button } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useMemo, useRef, useState } from 'react';

import {
  ForEachGroupItem,
  ForEachItem,
  SortItem,
  ValueSelector,
  ValueType,
} from '../../../../../models/datamapper/mapping';
import { XPathEditorModal } from '../../../../XPath/XPathEditorModal';
import { TypeaheadXPathInput, TypeaheadXPathInputOption } from '../../TypeaheadXPathInput';
import { useSortKeyItems } from './useSortKeyItems';

interface SortKeyProps {
  index: number;
  sortItem: SortItem;
  mapping: ForEachItem | ForEachGroupItem;
  onExpressionChange: (index: number, value: string) => void;
  onOrderToggle: (index: number) => void;
  onRemove: (index: number) => void;
}

export const SortKey: FunctionComponent<SortKeyProps> = ({
  index,
  sortItem,
  mapping,
  onExpressionChange,
  onOrderToggle,
  onRemove,
}) => {
  const position = index + 1;
  const sortKeyItems = useSortKeyItems(mapping);

  const options: TypeaheadXPathInputOption[] = useMemo(
    () => sortKeyItems.map((opt) => ({ value: opt.xpath, description: opt.description })),
    [sortKeyItems],
  );

  const handleChange = useCallback(
    (value: string) => {
      onExpressionChange(index, value);
    },
    [index, onExpressionChange],
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
    onExpressionChange(index, xpathProxyRef.current.expression);
  }, [index, onExpressionChange]);

  const handleXPathClose = useCallback(() => {
    xpathProxyRef.current = null;
    setIsXpathEditorOpen(false);
  }, []);

  return (
    <div className="sort-modal__row">
      <Button
        variant="plain"
        aria-label={`Sort order ${position}: ${sortItem.order}`}
        data-testid={`sort-order-${index}`}
        title={sortItem.order === 'ascending' ? 'Ascending' : 'Descending'}
        onClick={() => onOrderToggle(index)}
        icon={sortItem.order === 'ascending' ? <SortAscending /> : <SortDescending />}
      />
      <TypeaheadXPathInput
        value={sortItem.expression}
        onChange={handleChange}
        options={options}
        id={`sort-expression-${index}`}
        data-testid={`sort-expression-${index}`}
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
  );
};
