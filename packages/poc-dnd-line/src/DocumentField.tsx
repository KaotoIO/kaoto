import { AccordionContent, AccordionItem, AccordionToggle } from '@patternfly/react-core';
import { forwardRef, FunctionComponent, useCallback, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useCanvas } from './canvas/useCanvas';

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
  ({ field, path, initialExpanded = false, onToggle }, forwardedRef) => {
    const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);
    const fieldId = field.name + Math.random();
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

    const droppableStyle = {
      color: isOver ? 'green' : undefined,
    };
    const draggableStyle = transform
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
            <AccordionContent>
              <div ref={setDroppableNodeRef} style={droppableStyle}>
                <div
                  id={'draggable-' + fieldId}
                  ref={setDraggableNodeRef}
                  style={draggableStyle}
                  {...listeners}
                  {...attributes}
                >
                  {field.name}
                </div>
              </div>
            </AccordionContent>
          ) : (
            <>
              <AccordionToggle onClick={() => setIsExpanded(!isExpanded)} isExpanded={isExpanded} id={field.name}>
                <div ref={setDroppableNodeRef} style={droppableStyle}>
                  <div ref={setDraggableNodeRef} style={draggableStyle} {...listeners} {...attributes}>
                    {field.name}
                  </div>
                </div>
              </AccordionToggle>
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
