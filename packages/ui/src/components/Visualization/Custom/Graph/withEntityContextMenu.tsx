import { WithContextMenuProps } from '@patternfly/react-topology';
import React, { ComponentType, FunctionComponent, useMemo } from 'react';

import { useCanvasEntities } from '../../../../hooks/useCanvasEntities';
import { generateEntityContextMenu } from './generateEntityContextMenu';

export interface WithEntityContextMenuProps {
  entityContextMenuFn: () => React.ReactElement[];
  canPasteEntity: boolean;
  pasteEntity: () => Promise<void>;
}
export const withEntityContextMenu = (
  WrappedComponent: ComponentType<WithEntityContextMenuProps>,
): FunctionComponent => {
  const Component: FunctionComponent<WithContextMenuProps> = (props) => {
    const entityData = useCanvasEntities();
    const entityContextMenuFn = useMemo(() => () => generateEntityContextMenu(entityData), [entityData]);
    return (
      <WrappedComponent
        {...props}
        entityContextMenuFn={entityContextMenuFn}
        canPasteEntity={entityData.canPasteEntity}
        pasteEntity={entityData.pasteEntity}
      />
    );
  };
  return Component;
};
