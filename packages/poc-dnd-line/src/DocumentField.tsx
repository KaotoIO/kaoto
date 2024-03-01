import { AccordionContent, AccordionItem, AccordionToggle } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

type DocumentFieldProps = {
  field: any;
  initialExpanded?: boolean;
};
export const DocumentField: FunctionComponent<DocumentFieldProps> = ({ field, initialExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: 'droppable',
  });
  const droppableStyle = {
    color: isOver ? 'green' : undefined,
  };
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
  } = useDraggable({
    id: 'draggable',
  });
  const draggableStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;
  const renderField = useCallback(
    (field: any) => {
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
              <AccordionContent isHidden={!isExpanded} id={field.name}>
                {field.fields.map((f: any) => (
                  <DocumentField field={f} />
                ))}
              </AccordionContent>
            </>
          ) : (
            <AccordionContent id={field.name}>
              <div ref={setDroppableNodeRef} style={droppableStyle}>
                <div ref={setDraggableNodeRef} style={draggableStyle} {...listeners} {...attributes}>
                  {field.name}
                </div>
              </div>
            </AccordionContent>
          )}
        </AccordionItem>
      );
    },
    [isExpanded],
  );

  return renderField(field);
};
