import { Divider } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, PasteIcon, PlusIcon } from '@patternfly/react-icons';
import {
  ContextMenuItem,
  ContextSubMenuItem,
  ElementContext,
  GraphComponent,
  withContextMenu,
  withPanZoom,
} from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, ReactElement, useContext } from 'react';

import { IDataTestID } from '../../../../models';
import { ShowOrHideAllFlows } from './ShowOrHideAllFlows';
import { withEntityContextMenu, WithEntityContextMenuProps } from './withEntityContextMenu';

interface GraphContextMenuOptions {
  entityContextMenuFn: () => ReactElement[];
  canPasteEntity: boolean;
  pasteEntity: () => Promise<void>;
}

export const GraphContextMenuFn = ({
  entityContextMenuFn,
  canPasteEntity,
  pasteEntity,
}: GraphContextMenuOptions): ReactElement<PropsWithChildren<IDataTestID>>[] => {
  const items: ReactElement<PropsWithChildren<IDataTestID>>[] = [
    <ShowOrHideAllFlows key="showAll" data-testid="context-menu-item-show-all" mode="showAll">
      <EyeIcon />
      <span className="pf-v6-u-m-sm">Show all</span>
    </ShowOrHideAllFlows>,
    <ShowOrHideAllFlows key="hideAll" data-testid="context-menu-item-hide-all" mode="hideAll">
      <EyeSlashIcon />
      <span className="pf-v6-u-m-sm">Hide all</span>
    </ShowOrHideAllFlows>,
    <Divider key="paste-divider" />,
    <ContextMenuItem
      key="paste-entity"
      data-testid="context-menu-item-paste"
      isDisabled={!canPasteEntity}
      onClick={pasteEntity}
    >
      <PasteIcon />
      <span className="pf-v6-u-m-sm">Paste</span>
    </ContextMenuItem>,
  ];

  const entities = entityContextMenuFn();

  if (entities.length > 0) {
    items.push(<Divider key="new-entity-divider" />);
    items.push(
      <ContextSubMenuItem
        key="new-entity"
        data-testid="context-menu-item-new-entity"
        label={
          <>
            <PlusIcon />
            <span className="pf-v6-u-m-sm">New</span>
          </>
        }
      >
        {entities}
      </ContextSubMenuItem>,
    );
  }

  return items;
};

const BaseCustomGraph: FunctionComponent<WithEntityContextMenuProps> = ({
  entityContextMenuFn,
  canPasteEntity,
  pasteEntity,
  ...rest
}) => {
  const contextMenuFn = () => GraphContextMenuFn({ entityContextMenuFn, canPasteEntity, pasteEntity });
  const element = useContext(ElementContext);
  const EnhancedGraphComponent = withPanZoom()(withContextMenu(contextMenuFn)(GraphComponent));

  return <EnhancedGraphComponent {...rest} element={element} />;
};

export const CustomGraphWithSelection = withEntityContextMenu(BaseCustomGraph);
