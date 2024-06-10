import {
  createContext,
  FunctionComponent,
  MutableRefObject,
  PropsWithChildren,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  DataRef,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Label } from '@patternfly/react-core';
import { useDataMapper } from '../hooks/useDataMapper';
import { MappingItem } from '../models/mapping';
import { DnDHandler } from './dnd/DnDHandler';

export interface NodeReference {
  headerRef: HTMLDivElement | null;
  containerRef: HTMLDivElement | null;
}

export interface ICanvasContext {
  setNodeReference: (path: string, ref: MutableRefObject<NodeReference>) => void;
  getNodeReference: (path: string) => MutableRefObject<NodeReference> | null;
  reloadNodeReferences: () => void;
  getAllNodePaths: () => string[];
  getActiveHandler: () => DnDHandler | undefined;
  setActiveHandler: (handler: DnDHandler | undefined) => void;
}

export const CanvasContext = createContext<ICanvasContext | undefined>(undefined);

export const CanvasProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const { mappingTree, refreshMappingTree } = useDataMapper();
  const [activeHandler, setActiveHandler] = useState<DnDHandler | undefined>(undefined);

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

  const [activeData, setActiveData] = useState<DataRef<MappingItem> | null>(null);
  const [nodeReferenceMap, setNodeReferenceMap] = useState<Map<string, MutableRefObject<NodeReference>>>(
    new Map<string, MutableRefObject<NodeReference>>(),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      activeHandler && activeHandler.handleDragStart(event);
      setActiveData(event.active.data as DataRef<MappingItem>);
    },
    [activeHandler],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      activeHandler && activeHandler.handleDragEnd(event, mappingTree, refreshMappingTree);
      setActiveData(null);
    },
    [activeHandler, mappingTree, refreshMappingTree],
  );

  const setNodeReference = useCallback(
    (path: string, ref: MutableRefObject<NodeReference>) => {
      nodeReferenceMap.set(path, ref);
    },
    [nodeReferenceMap],
  );

  const getNodeReference = useCallback(
    (path: string) => {
      return nodeReferenceMap.get(path) || null;
    },
    [nodeReferenceMap],
  );

  const reloadNodeReferences = useCallback(() => {
    setNodeReferenceMap(new Map(nodeReferenceMap));
  }, [nodeReferenceMap]);

  const getAllNodePaths = useCallback(() => {
    return Array.from(nodeReferenceMap.keys());
  }, [nodeReferenceMap]);

  const value: ICanvasContext = useMemo(() => {
    return {
      setNodeReference,
      getNodeReference,
      reloadNodeReferences,
      getAllNodePaths,
      getActiveHandler: () => activeHandler,
      setActiveHandler,
    };
  }, [setNodeReference, getNodeReference, reloadNodeReferences, getAllNodePaths, activeHandler]);

  return (
    <CanvasContext.Provider value={value}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {props.children}
        <DragOverlay dropAnimation={null}>
          <Label>{activeData?.current?.expression ? activeData.current.expression : 'dragging...'}</Label>
        </DragOverlay>
      </DndContext>
    </CanvasContext.Provider>
  );
};
