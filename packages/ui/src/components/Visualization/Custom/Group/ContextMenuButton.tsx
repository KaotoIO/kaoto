import { Tooltip } from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { ContextMenu, PointIface } from '@patternfly/react-topology';
import { FunctionComponent, MouseEventHandler, useRef, useState } from 'react';
import { IDataTestID } from '../../../../models';
import { NodeContextMenu } from '../ContextMenu/NodeContextMenu';
import { CustomGroupProps } from './Group.models';

interface ContextMenuButtonProps extends IDataTestID {
  element: CustomGroupProps['element'];
}

export const ContextMenuButton: FunctionComponent<ContextMenuButtonProps> = ({
  element,
  ['data-testid']: dataTestId,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const reference = useRef<PointIface>({ x: 0, y: 0 });

  const onClick: MouseEventHandler<HTMLButtonElement> & MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    reference.current = { x: event.clientX, y: event.clientY };
    setIsOpen(!isOpen);
  };

  return (
    <>
      <Tooltip content="Contextual menu">
        <button
          className="container-controls"
          id="container-controls-contextual-menu"
          onClick={onClick}
          data-testid={dataTestId}
        >
          <EllipsisVIcon />
        </button>
      </Tooltip>
      <ContextMenu
        reference={reference.current}
        open={isOpen}
        onRequestClose={() => {
          setIsOpen(false);
        }}
      >
        <NodeContextMenu element={element} />
      </ContextMenu>
    </>
  );
};
