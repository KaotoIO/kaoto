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
import { IField } from '../models';
import { MappingService } from '../services/mapping.service';

export interface NodeReference {
  headerRef: HTMLDivElement | null;
  containerRef: HTMLDivElement | null;
}

export interface ICanvasContext {
  setNodeReference: (path: string, ref: MutableRefObject<NodeReference>) => void;
  getNodeReference: (path: string) => MutableRefObject<NodeReference> | null;
  reloadNodeReferences: () => void;
  getAllNodePaths: () => string[];
}

export const CanvasContext = createContext<ICanvasContext | undefined>(undefined);

export const CanvasProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const { mappings, refreshMappings } = useDataMapper();

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

  const [activeData, setActiveData] = useState<DataRef<IField> | null>(null);
  const [nodeReferenceMap, setNodeReferenceMap] = useState<Map<string, MutableRefObject<NodeReference>>>(
    new Map<string, MutableRefObject<NodeReference>>(),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveData(event.active.data as DataRef<IField>);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const fromField = event.active.data.current as IField;
      const toField = event.over?.data.current as IField;
      const { sourceField, targetField } = MappingService.validateFieldPairForNewMapping(mappings, fromField, toField);
      if (sourceField && targetField) {
        const mapping = MappingService.createNewMapping(sourceField, targetField);
        mappings.push(mapping);
        refreshMappings();
      }
      setActiveData(null);
    },
    [mappings, refreshMappings],
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
    };
  }, [setNodeReference, getNodeReference, reloadNodeReferences, getAllNodePaths]);

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
