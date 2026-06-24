import { CodeBlock, CodeBlockCode, Label, Popover } from '@patternfly/react-core';
import { WarningTriangleIcon } from '@patternfly/react-icons';
import { FunctionComponent, ReactNode } from 'react';

import { MappingNodeData } from '../../../models/datamapper/visualization';
import { NodeTitleUtil } from './node-title-util';
import { NodeTitleText } from './NodeTitleText';

interface MappingItemNodeTitleProps {
  className: string | undefined;
  rank: number;
  nodeData: MappingNodeData;
}

export const MappingItemNodeTitle: FunctionComponent<MappingItemNodeTitleProps> = ({ className, rank, nodeData }) => {
  const { isWarning, labelContent, titleText, popoverHeader, warnings, xmlSnippet, strategyLabel, groupingExpression } =
    NodeTitleUtil.getMappingItemLabelInfo(nodeData.mapping);

  const color = isWarning ? 'yellow' : undefined;
  const icon = isWarning ? <WarningTriangleIcon /> : undefined;

  let popoverBody: ReactNode;
  if (xmlSnippet) {
    popoverBody = (
      <CodeBlock>
        <CodeBlockCode>{xmlSnippet}</CodeBlockCode>
      </CodeBlock>
    );
  } else if (warnings && warnings.length > 0) {
    popoverBody = (
      <ul>
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    );
  } else if (strategyLabel) {
    popoverBody = (
      <div>
        <div>
          <strong>Strategy:</strong> {strategyLabel}
        </div>
        <div>
          <strong>Expression:</strong> {groupingExpression}
        </div>
      </div>
    );
  }

  const label = popoverHeader ? (
    <Popover
      triggerAction="click"
      minWidth="20rem"
      headerIcon={isWarning ? <WarningTriangleIcon color="yellow" /> : undefined}
      headerContent={popoverHeader}
      bodyContent={popoverBody}
      aria-label={popoverHeader}
    >
      <Label isClickable color={color} icon={icon}>
        {labelContent}
      </Label>
    </Popover>
  ) : (
    <Label color={color} icon={icon}>
      {labelContent}
    </Label>
  );

  return (
    <>
      {label}
      {titleText && <NodeTitleText className={className} rank={rank} title={titleText} />}
    </>
  );
};
