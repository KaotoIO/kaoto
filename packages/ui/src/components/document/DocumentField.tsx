import {
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  ActionList,
  ActionListItem,
  Button,
  Split,
  SplitItem,
  Tooltip,
} from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { IField } from '../../models';
import { useCanvas } from '../../hooks/useCanvas';
import { DocumentType } from '../../models/document';
import { NodeContainer } from './NodeContainer';
import { AtIcon, CircleIcon, GripVerticalIcon, LayerGroupIcon } from '@patternfly/react-icons';
import { NodeReference } from '../../providers/CanvasProvider';
import './Document.scss';
import { useDataMapper } from '../../hooks';
import { MappingService } from '../../services/mapping.service';
import './Document.scss';

type DocumentFieldButtonsProps = {
  field: IField;
};

const DocumentFieldButtons: FunctionComponent<DocumentFieldButtonsProps> = ({ field }) => {
  const { mappings, setSelectedMapping } = useDataMapper();
  const correlatedMappings = MappingService.getMappingsFor(mappings, field);

  const handleSelectMapping = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      setSelectedMapping(correlatedMappings[0]);
      event.stopPropagation();
    },
    [correlatedMappings, setSelectedMapping],
  );

  return (
    <ActionList>
      {correlatedMappings.length > 0 && (
        <ActionListItem>
          <Tooltip position={'auto'} enableFlip={true} content="Show Mapping Details">
            <Button
              size="sm"
              variant="plain"
              aria-label="Show Mapping Details"
              data-testid={`select-mapping-${field.ownerDocument?.documentId}-${field.name}-button`}
              onClick={handleSelectMapping}
              className="document-field__button"
              icon={<CircleIcon />}
            ></Button>
          </Tooltip>
        </ActionListItem>
      )}
    </ActionList>
  );
};

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
            <SplitItem isFilled>{field.name}</SplitItem>
            <SplitItem>
              <DocumentFieldButtons field={field} />
            </SplitItem>
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
              <SplitItem>
                <DocumentFieldButtons field={field} />
              </SplitItem>
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
