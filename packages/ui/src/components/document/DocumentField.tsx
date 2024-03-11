import { AccordionContent, AccordionItem, AccordionToggle } from '@patternfly/react-core';
import { forwardRef, FunctionComponent, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { IField } from '../../models';
import { useCanvas } from '../../hooks/useCanvas';

type DocumentFieldContentProps = {
  field: IField;
};

const DocumentFieldContent: FunctionComponent<DocumentFieldContentProps> = ({ field }) => {
  return field.isAttribute ? '@' + field.name : field.name;
};

type DocumentFieldProps = {
  field: IField;
  onToggle: () => void;
};

export const DocumentField: FunctionComponent<DocumentFieldProps> = ({ field, onToggle }) => {
  const { setFieldReference } = useCanvas();
  const ref = useRef<HTMLDivElement>(null);
  setFieldReference(field.path, ref);
  return <DocumentFieldImpl ref={ref} onToggle={onToggle} field={field} />;
};

const DocumentFieldImpl = forwardRef<HTMLDivElement, DocumentFieldProps>(({ field, onToggle }, forwardedRef) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: 'droppable-' + field.path,
    data: field,
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
  } = useDraggable({
    id: 'draggable-' + field.path,
    data: field,
  });

  const droppableStyle = {
    borderWidth: isOver ? 1 : undefined,
    borderColor: isOver ? 'blue' : undefined,
    color: isOver ? 'blue' : undefined,
  };
  const draggableStyle = transform
    ? {
        borderWidth: 1,
        borderColor: 'blue',
      }
    : undefined;

  return (
    <div ref={forwardedRef}>
      <AccordionItem>
        {!field.fields || field.fields.length === 0 ? (
          <div id={'droppable-' + field.path} ref={setDroppableNodeRef} style={droppableStyle}>
            <div
              id={'draggable-' + field.path}
              ref={setDraggableNodeRef}
              style={draggableStyle}
              {...listeners}
              {...attributes}
            >
              <AccordionContent>
                <DocumentFieldContent field={field} />
              </AccordionContent>
            </div>
          </div>
        ) : (
          <>
            <div id={'droppable-' + field.path} ref={setDroppableNodeRef} style={droppableStyle}>
              <div
                id={'draggable-' + field.path}
                ref={setDraggableNodeRef}
                style={draggableStyle}
                {...listeners}
                {...attributes}
              >
                <AccordionToggle onClick={() => setIsExpanded(!isExpanded)} isExpanded={isExpanded} id={field.name}>
                  <DocumentFieldContent field={field} />
                </AccordionToggle>
              </div>
            </div>
            <AccordionContent isHidden={!isExpanded} id={field.path}>
              {field.fields.map((f: IField) => (
                <DocumentField key={f.name} field={f} onToggle={onToggle} />
              ))}
            </AccordionContent>
          </>
        )}
      </AccordionItem>
    </div>
  );
});
