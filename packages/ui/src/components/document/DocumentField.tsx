import { AccordionContent, AccordionItem, AccordionToggle, Split, SplitItem } from '@patternfly/react-core';
import { FunctionComponent, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { DocumentType, IField } from '../../models/document';
import { useCanvas } from '../../hooks/useCanvas';
import { NodeContainer } from './NodeContainer';
import { AtIcon, GripVerticalIcon, LayerGroupIcon } from '@patternfly/react-icons';
import { NodeReference } from '../../providers/CanvasProvider';
import './Document.scss';
import { TargetFieldActions } from '../mapping/TargetFieldActions';

type DocumentFieldProps = {
  documentType: DocumentType;
  field: IField;
  onToggle: () => void;
};

export const DocumentField: FunctionComponent<DocumentFieldProps> = ({ documentType, field, onToggle }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const dndId = useMemo(() => field.name + '-' + Math.floor(Math.random() * 10000), [field.name]);
  const { getNodeReference, setNodeReference } = useCanvas();
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const nodeReference = useRef<NodeReference>({ headerRef: null, containerRef: null });
  useImperativeHandle(nodeReference, () => ({
    get headerRef() {
      return headerRef.current ?? containerRef.current;
    },
    get containerRef() {
      return containerRef.current;
    },
  }));
  const fieldRefId = field.fieldIdentifier.toString();
  getNodeReference(fieldRefId) !== nodeReference && setNodeReference(fieldRefId, nodeReference);

  return !field.fields || field.fields.length === 0 ? (
    <NodeContainer dndId={dndId} field={field} ref={containerRef}>
      <AccordionItem key={dndId}>
        <AccordionContent>
          <Split hasGutter>
            <SplitItem>
              <GripVerticalIcon />
            </SplitItem>
            {field.maxOccurs > 1 && (
              <SplitItem>
                <LayerGroupIcon />
              </SplitItem>
            )}
            {field.isAttribute && (
              <SplitItem>
                <AtIcon />
              </SplitItem>
            )}
            <SplitItem>{field.name}</SplitItem>
            <SplitItem>&nbsp;</SplitItem>
            {field.ownerDocument.documentType === DocumentType.TARGET_BODY && (
              <SplitItem>
                <TargetFieldActions field={field} />
              </SplitItem>
            )}
          </Split>
        </AccordionContent>
      </AccordionItem>
    </NodeContainer>
  ) : (
    <NodeContainer dndId={dndId} field={field} ref={containerRef}>
      <AccordionItem key={dndId}>
        <div ref={headerRef}>
          <AccordionToggle onClick={() => setIsExpanded(!isExpanded)} isExpanded={isExpanded} id={field.expression}>
            <Split hasGutter>
              <SplitItem>
                <GripVerticalIcon />
              </SplitItem>
              {field.maxOccurs > 1 && (
                <SplitItem>
                  <LayerGroupIcon />
                </SplitItem>
              )}
              <SplitItem isFilled>{field.name}</SplitItem>
              {field.ownerDocument.documentType === DocumentType.TARGET_BODY && (
                <SplitItem>
                  <TargetFieldActions field={field} />
                </SplitItem>
              )}
            </Split>
          </AccordionToggle>
        </div>
        <AccordionContent isHidden={!isExpanded} id={field.expression}>
          {field.fields.map((f: IField) => (
            <DocumentField documentType={documentType} key={f.expression} field={f} onToggle={onToggle} />
          ))}
        </AccordionContent>
      </AccordionItem>
    </NodeContainer>
  );
};
