import { useDndMonitor } from '@dnd-kit/core';
import { FunctionComponent, useEffect } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { IField } from '../../models';

export const CanvasMonitor: FunctionComponent = () => {
  useDndMonitor({
    onDragStart(event) {
      const fromField = event.active.data.current as IField;
      console.log(`onDragStart: [active: ${fromField?.fieldIdentifier.toString()}`);
    },
    onDragEnd(event) {
      const fromField = event.active?.data.current as IField;
      const toField = event.over?.data.current as IField;
      console.log(
        `onDragEnd: [active: ${fromField?.fieldIdentifier.toString()}, over:${toField?.fieldIdentifier.toString()}`,
      );
    },
    onDragCancel(event) {
      const fromField = event.active?.data.current as IField;
      const toField = event.over?.data.current as IField;
      console.log(
        `onDragCancel: active: ${fromField?.fieldIdentifier.toString()}, over:${toField?.fieldIdentifier.toString()}`,
      );
    },
  });

  const { getAllFieldPaths, reloadFieldReferences } = useCanvas();
  useEffect(() => {
    console.log(
      'Field References: [' +
        getAllFieldPaths()
          .map((p) => p + '\n')
          .toString() +
        ']',
    );
  }, [getAllFieldPaths, reloadFieldReferences]);

  return <></>;
};
