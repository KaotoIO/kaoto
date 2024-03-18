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

export interface ICanvasContext {
  setFieldReference: (path: string, ref: MutableRefObject<HTMLDivElement | null>) => void;
  getFieldReference: (path: string) => MutableRefObject<HTMLDivElement | null> | null;
  reloadFieldReferences: () => void;
  getAllFieldPaths: () => string[];
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
  const [fieldReferenceMap, setFieldReferenceMap] = useState<Map<string, MutableRefObject<HTMLDivElement | null>>>(
    new Map<string, MutableRefObject<HTMLDivElement>>(),
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

  const reloadFieldReferences = useCallback(() => {
    setFieldReferenceMap(new Map(fieldReferenceMap));
  }, [fieldReferenceMap]);

  const getAllFieldPaths = useCallback(() => {
    return Array.from(fieldReferenceMap.keys());
  }, [fieldReferenceMap]);

  const value: ICanvasContext = useMemo(() => {
    return {
      setFieldReference,
      getFieldReference,
      reloadFieldReferences,
      getAllFieldPaths,
    };
  }, [setFieldReference, getFieldReference, reloadFieldReferences, getAllFieldPaths]);

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
