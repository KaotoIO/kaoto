import './EditorEmptyState.scss';

import { Button } from '@carbon/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import noDataIcon from '../../assets/no-data.svg';
import notFoundIcon from '../../assets/not-found.svg';

export type EditorEmptyStateProps = PropsWithChildren<{
  /** Whether the editor list has at least one item. */
  hasItems: boolean;
  /** Singular name of the items, e.g. `bean`. */
  singular: string;
  /** Plural name of the items, e.g. `beans`. */
  plural: string;
  /** When provided, a "Show first {singular}" button is rendered if the list has items but none is selected. */
  onSelectFirst?: () => void;
  'data-testid'?: string;
}>;

/**
 * Empty state shown in the details panel of the editors when there is nothing to edit:
 * either the list is empty, or no item of the list is selected yet.
 *
 * Children are the actions (e.g. an "Add" button) and are only rendered when the list is empty.
 * `onSelectFirst` adds a button to select the first item and is only rendered when the list has items.
 */
export const EditorEmptyState: FunctionComponent<EditorEmptyStateProps> = ({
  hasItems,
  singular,
  plural,
  onSelectFirst,
  'data-testid': dataTestId = 'editor-empty-state',
  children,
}) => {
  const article = /^[aeiou]/i.test(singular) ? 'an' : 'a';
  const title = hasItems ? `There are no ${plural} selected` : `There are no ${plural} defined`;
  const subtitle = hasItems
    ? `Select ${article} ${singular} to show its properties`
    : `Start creating some ${plural} here`;

  return (
    <div className="editor-empty-state" data-testid={dataTestId}>
      <img
        src={hasItems ? noDataIcon : notFoundIcon}
        alt={hasItems ? 'no data' : 'not found'}
        className="editor-empty-state__icon"
      />
      <p className="editor-empty-state__title">{title}</p>
      <p className="editor-empty-state__subtitle">{subtitle}</p>
      {!hasItems && children && <div className="editor-empty-state__actions">{children}</div>}
      {hasItems && onSelectFirst && (
        <div className="editor-empty-state__actions">
          <Button kind="tertiary" onClick={onSelectFirst} data-testid={`${dataTestId}-select-first-btn`}>
            Show first {singular}
          </Button>
        </div>
      )}
    </div>
  );
};
