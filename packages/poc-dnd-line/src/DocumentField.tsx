import { AccordionContent, AccordionItem, AccordionToggle } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

type DocumentFieldProps = {
  field: any;
  initialExpanded?: boolean;
};
export const DocumentField: FunctionComponent<DocumentFieldProps> = ({ field, initialExpanded = false }) => {
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
  const renderField = useCallback(
    (field: any) => {
      const droppableStyle = {
        color: isOver ? 'green' : undefined,
      };
      const draggableStyle = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          }
        : undefined;
      return (
        <AccordionItem>
          {field.fields && field.fields.length !== 0 ? (
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
                  <DocumentField key={f.name} field={f} />
                ))}
              </AccordionContent>
            </>
          ) : (
            <div ref={setDroppableNodeRef} style={droppableStyle}>
              <div
                id={'draggable-' + fieldId}
                ref={setDraggableNodeRef}
                style={draggableStyle}
                {...listeners}
                {...attributes}
              >
                <AccordionContent id={fieldId}>{field.name}</AccordionContent>
              </div>
            </div>
          )}
        </AccordionItem>
      );
    },
    [attributes, fieldId, isExpanded, isOver, listeners, setDraggableNodeRef, setDroppableNodeRef, transform],
  );

  return renderField(field);
};
