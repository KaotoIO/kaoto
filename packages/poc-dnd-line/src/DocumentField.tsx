import { AccordionContent, AccordionItem, AccordionToggle } from '@patternfly/react-core';
import { forwardRef, FunctionComponent, useCallback, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

type DocumentFieldProps = {
  field: any;
  initialExpanded?: boolean;
  onToggle: () => void;
};
export const DocumentField = forwardRef<HTMLDivElement, DocumentFieldProps>(
  ({ field, initialExpanded = false, onToggle }, ref) => {
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
      <div ref={ref}>
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
                {field.fields.map((f: any) => (
                  <DocumentField onToggle={handleOnToggle} key={f.name} field={f} />
                ))}
              </AccordionContent>
            </>
          )}
        </AccordionItem>
      </div>
    );
  },
);
