import { AccordionContent, AccordionItem, AccordionToggle } from '@patternfly/react-core';
import { CSSProperties, forwardRef, FunctionComponent, useCallback, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useCanvas } from '../canvas/useCanvas';

/* eslint-disable  @typescript-eslint/no-explicit-any */
type ChildFieldProps = {
  field: any;
  parentPath: string;
  onToggle: () => void;
};

const ChildField: FunctionComponent<ChildFieldProps> = ({ field, parentPath, onToggle }) => {
  const ref = useRef();
  // TODO don't forget to add '@' prefix for attribute - maybe field.id could contain it
  const path = parentPath + '/' + field.name;
  const { setFieldReference } = useCanvas();
  setFieldReference(path, ref);

  return <DocumentField ref={ref} path={path} onToggle={onToggle} field={field} />;
};

type DocumentFieldProps = {
  field: any;
  path: string;
  initialExpanded?: boolean;
  onToggle: () => void;
};

export const DocumentField = forwardRef<HTMLDivElement, DocumentFieldProps>(
  ({ field, path, initialExpanded = true, onToggle }, forwardedRef) => {
    const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);
    const fieldId = path;
    const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
      id: 'droppable-' + fieldId,
    });
    const {
      attributes,
      listeners,
      setNodeRef: setDraggableNodeRef,
      transform,
    } = useDraggable({
      id: 'draggable-' + fieldId,
    });

    const droppableStyle: CSSProperties = {
      border: isOver ? 5 : 0,
      borderColor: isOver ? 'blue' : undefined,
      color: isOver ? 'blue' : undefined,
    };
    const draggableStyle: CSSProperties = transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : undefined;

    const handleOnToggle = useCallback(() => {
      onToggle();
    }, [onToggle]);

    return (
      <div ref={forwardedRef}>
        <AccordionItem>
          {!field.fields || field.fields.length == 0 ? (
            <div id={'droppable-' + fieldId} ref={setDroppableNodeRef} style={droppableStyle}>
              <div
                id={'draggable-' + fieldId}
                ref={setDraggableNodeRef}
                style={draggableStyle}
                {...listeners}
                {...attributes}
              >
                <AccordionContent>{field.name}</AccordionContent>
              </div>
            </div>
          ) : (
            <>
              <div id={'droppable-' + fieldId} ref={setDroppableNodeRef} style={droppableStyle}>
                <div
                  id={'draggable-' + fieldId}
                  ref={setDraggableNodeRef}
                  style={draggableStyle}
                  {...listeners}
                  {...attributes}
                >
                  <AccordionToggle onClick={() => setIsExpanded(!isExpanded)} isExpanded={isExpanded} id={field.name}>
                    {field.name}
                  </AccordionToggle>
                </div>
              </div>
              <AccordionContent isHidden={!isExpanded} id={fieldId}>
                {field.fields.map((field: any) => (
                  <ChildField key={field.name} field={field} parentPath={path} onToggle={onToggle} />
                ))}
              </AccordionContent>
            </>
          )}
        </AccordionItem>
      </div>
    );
  },
);
