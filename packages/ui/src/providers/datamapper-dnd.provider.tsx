import { DnDHandler } from './dnd/DnDHandler';
import { createContext, FunctionComponent, PropsWithChildren, useCallback, useMemo, useState } from 'react';
import {
  DataRef,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  DragStartEvent,
  useSensor,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensors,
} from '@dnd-kit/core';
import { NodeData } from '../models/datamapper';
import { Label } from '@patternfly/react-core';
import { useDataMapper } from '../hooks/useDataMapper';
import { DataMapperDnDMonitor } from './dnd/DataMapperDndMonitor';

export interface IDataMapperDndContext {
  handler?: DnDHandler;
}

export const DataMapperDndContext = createContext<IDataMapperDndContext>({});

type DataMapperDndContextProps = PropsWithChildren & {
  handler: DnDHandler | undefined;
};

export const DatamapperDndProvider: FunctionComponent<DataMapperDndContextProps> = (props) => {
  const { mappingTree, refreshMappingTree, debug } = useDataMapper();
  const [activeData, setActiveData] = useState<DataRef<NodeData> | null>(null);

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

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      props.handler && props.handler.handleDragStart(event);
      setActiveData(event.active.data as DataRef<NodeData>);
    },
    [props.handler],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      props.handler && props.handler.handleDragOver(event);
    },
    [props.handler],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      props.handler && props.handler.handleDragEnd(event, mappingTree, refreshMappingTree);
      setActiveData(null);
    },
    [mappingTree, props.handler, refreshMappingTree],
  );

  const handler = useMemo(() => {
    return {
      handler: props.handler,
    };
  }, [props.handler]);

  return (
    <DataMapperDndContext.Provider value={handler}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {props.children}
        <DragOverlay dropAnimation={null}>
          <Label>{activeData?.current?.title ? activeData.current.title : 'dragging...'}</Label>
        </DragOverlay>
        {debug && <DataMapperDnDMonitor />}
      </DndContext>
    </DataMapperDndContext.Provider>
  );
};
