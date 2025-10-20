import { Label, Popover, Title } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent } from 'react';
import { FieldItemNodeData, FieldNodeData, MappingNodeData } from '../../models/datamapper/visualization';
import './NodeTitle.scss';

interface INodeTitle {
  className?: string;
  rank: number;
  nodeData: FieldNodeData;
  isDocument: boolean;
}

export const NodeTitle: FunctionComponent<INodeTitle> = ({ className, rank, nodeData, isDocument }) => {
  const title = nodeData.title;
  const content = (
    <Popover
      triggerAction="hover"
      position="right"
      aria-label="Hoverable popover"
      bodyContent={
        <tbody>
          <tr>
            <td>minOccurs :&nbsp;</td>
            <td>{nodeData.field?.minOccurs}</td>
          </tr>
          <tr>
            <td>maxOccurs :&nbsp;</td>
            <td>{nodeData.field?.maxOccurs}</td>
          </tr>
        </tbody>
      }
    >
      <span className={clsx('node-title__text', className)} data-rank={rank}>
        {title}
      </span>
    </Popover>
  );

  if (nodeData instanceof MappingNodeData && !(nodeData instanceof FieldItemNodeData)) {
    return <Label>{content}</Label>;
  }

  if (isDocument) {
    return <Title headingLevel="h5">{content}</Title>;
  }

  return content;
};
