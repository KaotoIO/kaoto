import { DragOverEvent, useDndMonitor } from '@dnd-kit/core';
import { FunctionComponent, useEffect } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { NodeData } from '../../models/visualization';

export const CanvasMonitor: FunctionComponent = () => {
  useDndMonitor({
    onDragStart(event) {
      const fromField = event.active.data.current as NodeData;
      console.log(`onDragStart: [active: ${fromField?.path.toString()}`);
    },

    onDragOver(event: DragOverEvent) {
      const fromField = event.active?.data.current as NodeData;
      const toField = event.over?.data.current as NodeData;
      console.log(`onDragOver: [active: ${fromField?.path.toString()}, over:${toField?.path.toString()}`);
    },

    onDragEnd(event) {
      const fromField = event.active?.data.current as NodeData;
      const toField = event.over?.data.current as NodeData;
      console.log(`onDragEnd: [active: ${fromField?.path.toString()}, over:${toField?.path.toString()}`);
    },
    onDragCancel(event) {
      const fromField = event.active?.data.current as NodeData;
      const toField = event.over?.data.current as NodeData;
      console.log(`onDragCancel: active: ${fromField?.path.toString()}, over:${toField?.path.toString()}`);
    },
  });

  const { getAllNodePaths, reloadNodeReferences } = useCanvas();
  useEffect(() => {
    console.log(
      'Node References: [' +
        getAllNodePaths()
          .map((p) => p + '\n')
          .toString() +
        ']',
    );
  }, [getAllNodePaths, reloadNodeReferences]);

  return <></>;
};
