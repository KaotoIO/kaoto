import { Accordion, Page, Split, SplitItem } from '@patternfly/react-core';
import { sourceDoc, targetDoc } from './data';
import { DocumentField } from './field/DocumentField';
import { LineGroup } from './line/Line';
import { FunctionComponent, useCallback, useEffect, useRef } from 'react';
import { useCanvas } from './canvas/useCanvas';
import { CanvasProvider } from './canvas/CanvasProvider';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDndMonitor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

export const SourceTargetContainer: FunctionComponent = () => {
  const DnDMonitor: FunctionComponent = () => {
    useDndMonitor({
      onDragStart(event) {
        console.log('onDragStart:' + event);
      },
      onDragEnd(event) {
        console.log('onDragEnd:' + event);
      },
      onDragCancel(event) {
        console.log('onDragCancel:' + event);
      },
    });
    return <></>;
  };

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  return (
    <CanvasProvider>
      <DndContext sensors={sensors}>
        <DnDMonitor></DnDMonitor>
        <SourceTarget></SourceTarget>
      </DndContext>
    </CanvasProvider>
  );
};

const SourceTarget: FunctionComponent = () => {
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const { setFieldReference, reloadFieldReferences } = useCanvas();
  const sourcePath = sourceDoc.name + ':/';
  const targetPath = targetDoc.name + ':/';
  setFieldReference(sourcePath, sourceRef);
  setFieldReference(targetPath, targetRef);
  const mappings = [];

  const handleRefresh = useCallback(() => {
    reloadFieldReferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  return (
    <Page>
      <Split hasGutter>
        <LineGroup mappings={mappings}></LineGroup>
        <SplitItem isFilled>
          <Accordion isBordered={true} asDefinitionList={false} onClick={handleRefresh}>
            <DocumentField
              ref={sourceRef}
              path={sourcePath}
              field={sourceDoc}
              initialExpanded={true}
              onToggle={handleRefresh}
            ></DocumentField>
          </Accordion>
        </SplitItem>
        <SplitItem isFilled>draw lines here</SplitItem>
        <SplitItem isFilled>
          <Accordion isBordered={true} asDefinitionList={false} onClick={handleRefresh}>
            <DocumentField
              ref={targetRef}
              path={targetPath}
              field={targetDoc}
              initialExpanded={true}
              onToggle={handleRefresh}
            ></DocumentField>
          </Accordion>
        </SplitItem>
      </Split>
    </Page>
  );
};
