import { DragOverEvent, useDndMonitor } from '@dnd-kit/core';
import { FunctionComponent, useContext } from 'react';

import { NodeData } from '../../models/datamapper';
import { DataMapperDndContext } from '../datamapper-dnd.provider';

export const DataMapperDnDMonitor: FunctionComponent = () => {
  const { handler } = useContext(DataMapperDndContext);

  useDndMonitor({
    onDragStart(event) {
      const fromField = event.active.data.current as NodeData;
      console.debug(`onDragStart: [active: ${fromField?.path?.toString()}, handler=${handler?.constructor.name}]`);
    },

    onDragOver(event: DragOverEvent) {
      const fromField = event.active?.data.current as NodeData;
      const toField = event.over?.data.current as NodeData;
      console.debug(
        `onDragOver: [active: ${fromField?.path?.toString()}, over:${toField?.path?.toString()}, handler=${handler?.constructor.name}]`,
      );
    },

    onDragEnd(event) {
      const fromField = event.active?.data.current as NodeData;
      const toField = event.over?.data.current as NodeData;
      console.debug(
        `onDragEnd: [active: ${fromField?.path?.toString()}, over:${toField?.path?.toString()}, handler=${handler?.constructor.name}]`,
      );
    },
    onDragCancel(event) {
      const fromField = event.active?.data.current as NodeData;
      const toField = event.over?.data.current as NodeData;
      console.debug(
        `onDragCancel: active: ${fromField?.path?.toString()}, over:${toField?.path?.toString()}, handler=${handler?.constructor.name}]`,
      );
    },
  });

  return <></>;
};
