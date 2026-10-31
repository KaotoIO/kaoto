import { TreeNode } from '@carbon/react';
import { FunctionComponent } from 'react';

import { EditorTree } from '../../../components/EditorShell';
import { BeanBadge } from './BeanBadge';
import { BeanTreeToolbar } from './BeanTreeToolbar';

export interface BeanTreeListProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any[] | undefined;
  required: string[];
  name: string;
  selected: number;
  onSelected: (index: number) => void;
  onAddBean: () => void;
  onDeleteBean: () => void;
}

const ROW_ID_PREFIX = 'metadata-row-';

export const BeanTreeList: FunctionComponent<BeanTreeListProps> = (props) => {
  const model = props.model ?? [];

  const resolveSelection = (treeItem: HTMLElement) => {
    if (!treeItem.id.startsWith(ROW_ID_PREFIX)) return false;

    const index = Number(treeItem.id.slice(ROW_ID_PREFIX.length));
    if (index !== props.selected) {
      props.onSelected(index);
    }
    return true;
  };

  return (
    <>
      <BeanTreeToolbar
        name={props.name}
        selected={props.selected}
        onAddBean={props.onAddBean}
        onDeleteBean={props.onDeleteBean}
      />

      <EditorTree
        label={props.name}
        activeId={`${ROW_ID_PREFIX}${props.selected}`}
        menuLabel="Bean actions"
        deleteTestId="bean-context-delete-btn"
        resolveSelection={resolveSelection}
        onDelete={props.onDeleteBean}
      >
        {model.map((item, index) => (
          <TreeNode
            key={`${item[props.required[0]] ?? ''}-${index}`}
            id={`${ROW_ID_PREFIX}${index}`}
            data-testid={`${ROW_ID_PREFIX}${index}`}
            label={item.type ?? ''}
            renderIcon={item[props.required[0]] ? () => <BeanBadge name={item[props.required[0]]} /> : undefined}
            onSelect={() => {
              props.onSelected(index);
            }}
          />
        ))}
      </EditorTree>
    </>
  );
};
