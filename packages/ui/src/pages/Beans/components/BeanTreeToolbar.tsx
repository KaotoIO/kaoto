import { Add, TrashCan } from '@carbon/icons-react';
import { MenuItem, MenuItemDivider } from '@carbon/react';
import { FunctionComponent } from 'react';

import { EditorActionsMenu } from '../../../components/EditorShell';

export interface BeanTreeToolbarProps {
  name: string;
  selected: number;
  onAddBean: () => void;
  onDeleteBean: () => void;
}

export const BeanTreeToolbar: FunctionComponent<BeanTreeToolbarProps> = ({
  name,
  selected,
  onAddBean,
  onDeleteBean,
}) => {
  return (
    <EditorActionsMenu data-testid="bean-tree-toolbar-menu">
      <MenuItem label="Add new bean" renderIcon={Add} onClick={onAddBean} data-testid={`metadata-add-${name}-btn`} />
      <MenuItemDivider />
      <MenuItem
        kind="danger"
        label={`Delete ${name}`}
        renderIcon={TrashCan}
        onClick={onDeleteBean}
        disabled={selected === -1}
        data-testid={selected !== -1 ? `metadata-delete-${selected}-btn` : 'metadata-delete-btn'}
      />
    </EditorActionsMenu>
  );
};
