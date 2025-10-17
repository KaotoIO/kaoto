import { Content, ContentVariants } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { TargetDocument } from '../Document/TargetDocument';
import './TargetPanel.scss';

export const TargetPanel: FunctionComponent = () => {
  const { targetBodyDocument } = useDataMapper();
  const { reloadNodeReferences } = useCanvas();

  return (
    <div id="panel-target" className="target-panel" onScroll={reloadNodeReferences}>
      <Content component={ContentVariants.h3} className="target-panel__header">
        Target
      </Content>

      <TargetDocument document={targetBodyDocument} />
    </div>
  );
};
