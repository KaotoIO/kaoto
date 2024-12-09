import { FunctionComponent, useContext } from 'react';
import { DataMapperDndContext } from '../datamapper-dnd.provider';
import { NodeData } from '../../models/datamapper';
import { DragOverEvent, useDndMonitor } from '@dnd-kit/core';

export const DataMapperDnDMonitor: FunctionComponent = () => {
  const { handler } = useContext(DataMapperDndContext);

  useDndMonitor({
    onDragStart(event) {
      const fromField = event.active.data.current as NodeData;
      console.log(`onDragStart: [active: ${fromField?.path.toString()}, handler=${handler?.constructor.name}]`);
    },

    onDragOver(event: DragOverEvent) {
      const fromField = event.active?.data.current as NodeData;
      const toField = event.over?.data.current as NodeData;
      console.log(
        `onDragOver: [active: ${fromField?.path.toString()}, over:${toField?.path.toString()}, handler=${handler?.constructor.name}]`,
      );
    },

    onDragEnd(event) {
      const fromField = event.active?.data.current as NodeData;
      const toField = event.over?.data.current as NodeData;
      console.log(
        `onDragEnd: [active: ${fromField?.path.toString()}, over:${toField?.path.toString()}, handler=${handler?.constructor.name}]`,
      );
    },
    onDragCancel(event) {
      const fromField = event.active?.data.current as NodeData;
      const toField = event.over?.data.current as NodeData;
      console.log(
        `onDragCancel: active: ${fromField?.path.toString()}, over:${toField?.path.toString()}, handler=${handler?.constructor.name}]`,
      );
    },
  });

  return <></>;
};
