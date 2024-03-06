import { AccordionContent, AccordionItem, AccordionToggle } from '@patternfly/react-core';
import { FunctionComponent, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { IField } from '../../models';

type DocumentFieldProps = {
  field: IField;
};
export const DocumentField: FunctionComponent<DocumentFieldProps> = ({ field }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
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

  return (
    <AccordionItem>
      {!field.fields || field.fields.length === 0 ? (
        <AccordionContent>
          <div ref={setDroppableNodeRef} style={droppableStyle}>
            <div
              id={'draggable-' + fieldId}
              ref={setDraggableNodeRef}
              style={draggableStyle}
              {...listeners}
              {...attributes}
            >
              {field.isAttribute ? '@' + field.name : field.name}
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
            {field.fields.map((f: IField) => (
              <DocumentField key={f.name} field={f} />
            ))}
          </AccordionContent>
        </>
      )}
    </AccordionItem>
  );
};
