import { AccordionContent, AccordionItem, AccordionToggle, Split, SplitItem } from '@patternfly/react-core';
import { FunctionComponent, useImperativeHandle, useRef, useState } from 'react';
import { IField } from '../../../models/document';
import { useCanvas } from '../../../hooks/useCanvas';
import { NodeContainer } from '../NodeContainer';
import { AtIcon, GripVerticalIcon, LayerGroupIcon } from '@patternfly/react-icons';
import { NodeReference } from '../../../providers/CanvasProvider';
import '../Document.scss';
import { FieldNodeData } from '../../../models/visualization';

type DocumentFieldProps = {
  nodeData: FieldNodeData;
  onToggle: () => void;
};

export const SourceDocumentField: FunctionComponent<DocumentFieldProps> = ({ nodeData, onToggle }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const dndId = nodeData.id;
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
  const nodeRefId = nodeData.path.toString();
  getNodeReference(nodeRefId) !== nodeReference && setNodeReference(nodeRefId, nodeReference);

  return !nodeData.field.fields || nodeData.field.fields.length === 0 ? (
    <NodeContainer nodeData={nodeData} ref={containerRef}>
      <AccordionItem key={nodeData.id}>
        <AccordionContent>
          <Split hasGutter>
            <SplitItem>
              <GripVerticalIcon />
            </SplitItem>
            {nodeData.field.maxOccurs > 1 && (
              <SplitItem>
                <LayerGroupIcon />
              </SplitItem>
            )}
            {nodeData.field.isAttribute && (
              <SplitItem>
                <AtIcon />
              </SplitItem>
            )}
            <SplitItem>{nodeData.title}</SplitItem>
            <SplitItem>&nbsp;</SplitItem>
          </Split>
        </AccordionContent>
      </AccordionItem>
    </NodeContainer>
  ) : (
    <NodeContainer nodeData={nodeData} ref={containerRef}>
      <AccordionItem key={dndId}>
        <div ref={headerRef}>
          <AccordionToggle onClick={() => setIsExpanded(!isExpanded)} isExpanded={isExpanded} id={nodeData.id}>
            <Split hasGutter>
              <SplitItem>
                <GripVerticalIcon />
              </SplitItem>
              {nodeData.field.maxOccurs > 1 && (
                <SplitItem>
                  <LayerGroupIcon />
                </SplitItem>
              )}
              <SplitItem isFilled>{nodeData.title}</SplitItem>
            </Split>
          </AccordionToggle>
        </div>
        <AccordionContent isHidden={!isExpanded} id={nodeData.id}>
          {nodeData.field.fields.map((f: IField) => {
            const childNodeData = new FieldNodeData(nodeData, f);
            return <SourceDocumentField nodeData={childNodeData} key={childNodeData.id} onToggle={onToggle} />;
          })}
        </AccordionContent>
      </AccordionItem>
    </NodeContainer>
  );
};
