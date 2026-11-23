import { Edit, TrashCan } from '@carbon/icons-react';
import { FunctionComponent, ReactNode } from 'react';

import { EntryActionButton } from './EntryActionButton';
import { ExplorerFile } from './explorer-file';

interface EntryLabelProps {
  node: ExplorerFile;
  query: string;
  requestDelete: (node: ExplorerFile) => void;
  requestRename: (nodeId: string) => void;
}

/** Wrap the matching substring in a <mark> for visual highlighting. */
function highlightMatch(name: string, query: string): ReactNode {
  if (!query) return <span title={name}>{name}</span>;
  const idx = name.toLowerCase().indexOf(query);
  if (idx === -1) return <span title={name}>{name}</span>;
  return (
    <span title={name}>
      {name.slice(0, idx)}
      <mark className="cs--explorer__highlight">{name.slice(idx, idx + query.length)}</mark>
      {name.slice(idx + query.length)}
    </span>
  );
}

/**
 * The label of an Explorer entry with its buttons: rename and delete.
 *
 * It is a component of its own so that Carbon finds no text in the label and does not wrap a truncated name in its
 * tooltip button, which the buttons cannot be nested in; the name has a `title` for its full text instead.
 *
 * The buttons show on hover and are left out of the accessibility tree and the tab order: inside a tree item they would
 * add their names to the item's name and tab stops to every item. Keyboard and screen reader users press F2 or Delete
 * on the item.
 */
export const EntryLabel: FunctionComponent<EntryLabelProps> = ({ node, query, requestDelete, requestRename }) => (
  <>
    {highlightMatch(node.name, query)}
    <span className="cs--explorer__node-actions" aria-hidden="true">
      <EntryActionButton
        label={node.children ? 'Rename folder' : 'Rename file'}
        testId={`explorer-rename-${node.path}`}
        icon={Edit}
        onClick={() => {
          requestRename(node.id);
        }}
      />
      <EntryActionButton
        label={node.children ? 'Delete folder' : 'Delete file'}
        testId={`explorer-delete-${node.path}`}
        icon={TrashCan}
        onClick={() => {
          requestDelete(node);
        }}
      />
    </span>
  </>
);
