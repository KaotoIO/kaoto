import './BaseNode.scss';

import { At, ChevronDown, ChevronRight, Choices, Draggable, ValueVariable } from '@carbon/icons-react';
import { Icon } from '@patternfly/react-core';
import { LayerGroupIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEventHandler, PropsWithChildren, ReactNode } from 'react';

import { IDataTestID } from '../../../models';
import {
  AddMappingNodeData,
  NodeData,
  UnknownMappingNodeData,
  VariableNodeData,
} from '../../../models/datamapper/visualization';
import { VisualizationService } from '../../../services/visualization.service';
import { FieldIcon } from '../FieldIcon';

interface BaseNodeProps extends IDataTestID {
  /** Node data containing all node information */
  nodeData: NodeData;

  /** Controls whether the Expansion icon is shown */
  isExpandable?: boolean;
  /** Expansion status. Requires `isExpandable=true` */
  isExpanded?: boolean;
  /** Expansion handler */
  onExpandChange?: MouseEventHandler<HTMLElement>;

  /** Title node */
  title: ReactNode;

  /** Hierarchical depth level for indentation */
  rank?: number;

  /** Selection state */
  isSelected?: boolean;

  /** Node path for connection port identification */
  nodePath?: string;

  /** Document ID for connection port identification */
  documentId?: string;
}

export const BaseNode: FunctionComponent<PropsWithChildren<BaseNodeProps>> = ({
  nodeData,
  isExpandable,
  isExpanded,
  onExpandChange,
  title,
  rank,
  isSelected,
  nodePath,
  documentId,
  'data-testid': dataTestId,
  children,
}) => {
  // Derive properties from nodeData
  const field = VisualizationService.getField(nodeData);
  const iconType = field?.type ?? nodeData.type;
  const isCollectionField = VisualizationService.isCollectionField(nodeData);
  const isChoiceField = VisualizationService.isChoiceField(nodeData);
  const isAttributeField = VisualizationService.isAttributeField(nodeData);
  const isVariableNode = nodeData instanceof VariableNodeData;
  const isDocument = VisualizationService.isDocumentNode(nodeData);
  const isDraggable =
    !(nodeData instanceof UnknownMappingNodeData) &&
    !(nodeData instanceof AddMappingNodeData) &&
    (!isDocument || VisualizationService.isPrimitiveDocumentNode(nodeData));
  const isSource = nodeData.isSource;
  return (
    <section
      className="node__row"
      data-draggable={isDraggable}
      data-expandable={isExpandable}
      data-selected={isSelected}
      style={{ '--node-rank': rank } as React.CSSProperties}
    >
      {nodePath && documentId && (
        <span
          className={`node__connection-port ${isSource ? 'node__connection-port--source' : 'node__connection-port--target'}`}
          data-testid={`connection-port-${dataTestId}`}
          data-connection-port="true"
          data-node-path={nodePath}
          data-document-id={documentId}
        />
      )}

      {isExpandable && (
        <Icon className="node__expand" onClick={onExpandChange}>
          {isExpanded && <ChevronDown data-testid={`expand-icon-${dataTestId}`} />}
          {!isExpanded && <ChevronRight data-testid={`collapse-icon-${dataTestId}`} />}
        </Icon>
      )}

      {isDraggable && (
        <Icon className="node__spacer" data-drag-handler>
          <Draggable />
        </Icon>
      )}
      {title}
      {isCollectionField && (
        <Icon className="node__spacer" data-testid="collection-field-icon">
          <LayerGroupIcon />
        </Icon>
      )}
      {isChoiceField && (
        <Icon className="node__spacer" data-testid="choice-field-icon">
          <Choices />
        </Icon>
      )}
      <FieldIcon className="node__spacer" type={iconType} />

      {isAttributeField && (
        <Icon className="node__spacer" data-testid="attribute-field-icon">
          <At />
        </Icon>
      )}
      {isVariableNode && (
        <Icon className="node__spacer" data-testid="variable-node-icon">
          <ValueVariable />
        </Icon>
      )}

      {children}
    </section>
  );
};
