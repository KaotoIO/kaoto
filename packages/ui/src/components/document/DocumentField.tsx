import { AccordionContent, AccordionItem, AccordionToggle, Split, SplitItem } from '@patternfly/react-core';
import { forwardRef, FunctionComponent, useMemo, useRef, useState } from 'react';
import { IField } from '../../models';
import { useCanvas } from '../../hooks/useCanvas';
import { DocumentType } from '../../models/document';
import { DnDContainer } from './DnDContainer';
import { GripVerticalIcon } from '@patternfly/react-icons';

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

    return !field.fields || field.fields.length === 0 ? (
      <div ref={forwardedRef}>
        <DnDContainer dndId={dndId} field={field}>
          <AccordionItem key={dndId}>
            <AccordionContent>
              <Split hasGutter>
                <SplitItem>
                  <GripVerticalIcon />
                </SplitItem>
                <SplitItem>{field.expression}</SplitItem>
              </Split>
            </AccordionContent>
          </AccordionItem>
        </DnDContainer>
      </div>
    ) : (
      <div ref={forwardedRef}>
        <DnDContainer dndId={dndId} field={field}>
          <AccordionItem key={dndId}>
            <AccordionToggle onClick={() => setIsExpanded(!isExpanded)} isExpanded={isExpanded} id={field.expression}>
              <Split hasGutter>
                <SplitItem>
                  <GripVerticalIcon />
                </SplitItem>
                <SplitItem>{field.expression}</SplitItem>
              </Split>
            </AccordionToggle>
            <AccordionContent isHidden={!isExpanded} id={field.expression}>
              {field.fields.map((f: IField) => (
                <DocumentField documentType={documentType} key={f.expression} field={f} onToggle={onToggle} />
              ))}
            </AccordionContent>
          </AccordionItem>
        </DnDContainer>
      </div>
    );
  },
);
