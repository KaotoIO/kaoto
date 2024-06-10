import { AccordionContent, AccordionItem, AccordionToggle, Split, SplitItem } from '@patternfly/react-core';
import { FunctionComponent, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useCanvas } from '../../../hooks/useCanvas';
import { NodeContainer } from '../NodeContainer';
import { AtIcon, GripVerticalIcon, LayerGroupIcon } from '@patternfly/react-icons';
import { NodeReference } from '../../../providers/CanvasProvider';
import '../Document.scss';
import { TargetFieldActions } from './TargetFieldActions';

import { NodeData } from '../../../models/visualization';
import { NodeHelper } from './node-helper';

type TargetDocumentNodeProps = {
  nodeData: NodeData;
  onToggle: () => void;
};

export const TargetDocumentNode: FunctionComponent<TargetDocumentNodeProps> = ({ nodeData, onToggle }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const dndId = useMemo(() => nodeData.id, [nodeData.id]);
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

  const isCollection = NodeHelper.isCollectionField(nodeData);
  const isAttribute = NodeHelper.isAttributeField(nodeData);
  const nodeDataChildren = NodeHelper.generateNodeDataChildren(nodeData);

  return nodeDataChildren.length === 0 ? (
    <NodeContainer nodeData={nodeData} ref={containerRef}>
      <AccordionItem key={dndId}>
        <AccordionContent>
          <Split hasGutter>
            <SplitItem>
              <GripVerticalIcon />
            </SplitItem>
            {isCollection && (
              <SplitItem>
                <LayerGroupIcon />
              </SplitItem>
            )}
            {isAttribute && (
              <SplitItem>
                <AtIcon />
              </SplitItem>
            )}
            <SplitItem>{nodeData.title}</SplitItem>
            <SplitItem>&nbsp;</SplitItem>
            <SplitItem>
              <TargetFieldActions nodeData={nodeData} />
            </SplitItem>
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
              {isCollection && (
                <SplitItem>
                  <LayerGroupIcon />
                </SplitItem>
              )}
              <SplitItem isFilled>{nodeData.title}</SplitItem>
              <SplitItem>
                <TargetFieldActions nodeData={nodeData} />
              </SplitItem>
            </Split>
          </AccordionToggle>
        </div>
        <AccordionContent isHidden={!isExpanded} id={nodeData.id}>
          {nodeDataChildren.map((nodeData) => (
            <TargetDocumentNode nodeData={nodeData} key={nodeData.id} onToggle={onToggle} />
          ))}
        </AccordionContent>
      </AccordionItem>
    </NodeContainer>
  );
};
