import { Content, ContentVariants } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { Parameters } from '../Document/Parameters';
import { SourceDocument } from '../Document/SourceDocument';
import './SourcePanel.scss';

type SourcePanelProps = {
  isReadOnly?: boolean;
};

export const SourcePanel: FunctionComponent<SourcePanelProps> = ({ isReadOnly = false }) => {
  const { sourceBodyDocument } = useDataMapper();
  const { reloadNodeReferences } = useCanvas();

  return (
    <div id="panel-source" className="source-panel" onScroll={reloadNodeReferences}>
      <Content component={ContentVariants.h3} className="source-panel__header">
        Source
      </Content>

      <Parameters isReadOnly={isReadOnly} />

      <SourceDocument document={sourceBodyDocument} isReadOnly={isReadOnly} />
    </div>
  );
};
