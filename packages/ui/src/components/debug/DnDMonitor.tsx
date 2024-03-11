import { useDndMonitor } from '@dnd-kit/core';
import { FunctionComponent } from 'react';

export const DnDMonitor: FunctionComponent = () => {
  useDndMonitor({
    onDragStart(event) {
      console.log(`onDragStart: [active: ${JSON.stringify(event.active?.data.current?.path)}`);
    },
    onDragEnd(event) {
      console.log(
        `onDragEnd: [active: ${JSON.stringify(event.active?.data.current?.path)}, over:${JSON.stringify(event.over?.data.current?.path)}`,
      );
    },
    onDragCancel(event) {
      console.log(
        `onDragCancel: active: ${JSON.stringify(event.active?.data.current?.path)}, over:${JSON.stringify(event.over?.data.current?.path)}`,
      );
    },
  });
  return <></>;
};
