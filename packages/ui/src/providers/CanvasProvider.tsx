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
import { useDataMapper } from '../hooks';
import { IField } from '../models';
import { MappingService } from '../services/mapping.service';
import { DnDMonitor } from '../components/debug/DnDMonitor';

export interface ICanvasContext {
  setFieldReference: (path: string, ref: MutableRefObject<HTMLDivElement | null>) => void;
  getFieldReference: (path: string) => MutableRefObject<HTMLDivElement | null> | null;
  getAllFieldPaths: () => string[];
  reloadFieldReferences: () => void;
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

  const [activeData, setActiveData] = useState<DataRef<Record<string, string>> | null>(null);
  const [fieldReferenceMap, setFieldReferenceMap] = useState<Map<string, MutableRefObject<HTMLDivElement | null>>>(
    new Map<string, MutableRefObject<HTMLDivElement>>(),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveData(event.active.data);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const sourceField = event.active.data.current as IField;
      const targetField = event.over?.data.current as IField;
      if (sourceField && targetField && !MappingService.mappingExists(mappings, sourceField, targetField)) {
        const mapping = MappingService.createNewMapping(sourceField, targetField);
        mappings.push(mapping);
        refreshMappings();
      }
    },
    [mappings, refreshMappings],
  );

  const setFieldReference = useCallback(
    (path: string, ref: MutableRefObject<HTMLDivElement | null>) => {
      fieldReferenceMap.set(path, ref);
    },
    [fieldReferenceMap],
  );

  const getFieldReference = useCallback(
    (path: string) => {
      return fieldReferenceMap.get(path) || null;
    },
    [fieldReferenceMap],
  );

  const getAllFieldPaths = useCallback(() => {
    return Array.from(fieldReferenceMap.keys());
  }, [fieldReferenceMap]);

  const reloadFieldReferences = useCallback(() => {
    setFieldReferenceMap(new Map(fieldReferenceMap));
  }, [fieldReferenceMap]);

  const value: ICanvasContext = useMemo(() => {
    return {
      setFieldReference,
      getFieldReference,
      getAllFieldPaths,
      reloadFieldReferences,
    };
  }, [setFieldReference, getFieldReference, getAllFieldPaths, reloadFieldReferences]);

  return (
    <CanvasContext.Provider value={value}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <DnDMonitor></DnDMonitor>
        {props.children}
        <DragOverlay dropAnimation={null}>
          <Label>{activeData?.current?.name ? activeData.current.name : 'dragging...'}</Label>
        </DragOverlay>
      </DndContext>
    </CanvasContext.Provider>
  );
};
