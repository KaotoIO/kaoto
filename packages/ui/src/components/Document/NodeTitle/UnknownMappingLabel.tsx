import { CodeBlock, CodeBlockCode, Label, Popover } from '@patternfly/react-core';
import { WarningTriangleIcon } from '@patternfly/react-icons';
import { FunctionComponent, ReactNode } from 'react';

import { UnknownMappingNodeData } from '../../../models/datamapper';
import { VisualizationService } from '../../../services/visualization/visualization.service';

export const UnknownMappingLabel: FunctionComponent<{ nodeData: UnknownMappingNodeData; content: ReactNode }> = ({
  nodeData,
  content,
}) => {
  const xmlSnippet = VisualizationService.formatXml(nodeData.mapping.element);

  return (
    <Popover
      triggerAction="click"
      minWidth="40rem"
      headerIcon={<WarningTriangleIcon color="yellow" />}
      headerContent="Unsupported element detected"
      bodyContent={
        <CodeBlock>
          <CodeBlockCode>{xmlSnippet}</CodeBlockCode>
        </CodeBlock>
      }
      aria-label={'Unknown XSLT element'}
    >
      <Label isClickable color="yellow" icon={<WarningTriangleIcon />}>
        {content}
      </Label>
    </Popover>
  );
};
