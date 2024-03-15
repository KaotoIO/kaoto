import { AccordionContent, AccordionItem, AccordionToggle } from '@patternfly/react-core';
import { forwardRef, FunctionComponent, useMemo, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { IField } from '../../models';
import { useCanvas } from '../../hooks/useCanvas';
import { DocumentType } from '../../models/document';

type DocumentFieldProps = {
  documentType: DocumentType;
  field: IField;
  onToggle: () => void;
};

export const DocumentField: FunctionComponent<DocumentFieldProps> = ({ documentType, field, onToggle }) => {
  const { getFieldReference, setFieldReference } = useCanvas();
  const ref = useRef<HTMLDivElement>(null);
  const fieldRefId = field.fieldIdentifier.toString();
  getFieldReference(fieldRefId) !== ref && setFieldReference(fieldRefId, ref);
  return <DocumentFieldImpl documentType={documentType} ref={ref} onToggle={onToggle} field={field} />;
};

const DocumentFieldImpl = forwardRef<HTMLDivElement, DocumentFieldProps>(
  ({ documentType, field, onToggle }, forwardedRef) => {
    const [isExpanded, setIsExpanded] = useState<boolean>(true);
    const dndId = useMemo(() => field.name + '-' + Math.floor(Math.random() * 10000), [field.name]);

    const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
      id: 'droppable-' + dndId,
      data: field,
    });
    const {
      attributes,
      listeners,
      setNodeRef: setDraggableNodeRef,
      transform,
    } = useDraggable({
      id: 'draggable-' + dndId,
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
            <div id={'droppable-' + dndId} ref={setDroppableNodeRef} style={droppableStyle}>
              <div
                id={'draggable-' + dndId}
                ref={setDraggableNodeRef}
                style={draggableStyle}
                {...listeners}
                {...attributes}
              >
                <AccordionContent>{field.expression}</AccordionContent>
              </div>
            </div>
          ) : (
            <>
              <div id={'droppable-' + dndId} ref={setDroppableNodeRef} style={droppableStyle}>
                <div
                  id={'draggable-' + dndId}
                  ref={setDraggableNodeRef}
                  style={draggableStyle}
                  {...listeners}
                  {...attributes}
                >
                  <AccordionToggle
                    onClick={() => setIsExpanded(!isExpanded)}
                    isExpanded={isExpanded}
                    id={field.expression}
                  >
                    {field.expression}
                  </AccordionToggle>
                </div>
              </div>
              <AccordionContent isHidden={!isExpanded} id={field.expression}>
                {field.fields.map((f: IField) => (
                  <DocumentField documentType={documentType} key={f.expression} field={f} onToggle={onToggle} />
                ))}
              </AccordionContent>
            </>
          )}
        </AccordionItem>
      </div>
    );
  },
);
