import './EditorActionsMenu.scss';

import { MenuButton } from '@carbon/react';
import { FunctionComponent, PropsWithChildren, Ref } from 'react';

export type EditorActionsMenuProps = PropsWithChildren<{
  /** Forwarded to the MenuButton container element (not to the inner button). */
  ref?: Ref<HTMLDivElement>;
  'data-testid'?: string;
}>;

/**
 * Tertiary "Actions" menu button used on top of the editor trees.
 * Children are the `MenuItem`s of the menu.
 */
export const EditorActionsMenu: FunctionComponent<EditorActionsMenuProps> = ({
  ref,
  'data-testid': dataTestId,
  children,
}) => {
  return (
    <div className="editor-actions-menu">
      <MenuButton ref={ref} kind="tertiary" label="Actions" data-testid={dataTestId}>
        {children}
      </MenuButton>
    </div>
  );
};
