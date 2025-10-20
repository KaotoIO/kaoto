import { FunctionComponent } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { Parameters } from '../Document/Parameters';
import { SourceDocument } from '../Document/SourceDocument';
import { ExpansionPanel } from '../ExpansionPanels/ExpansionPanel';
import { ExpansionPanels } from '../ExpansionPanels/ExpansionPanels';
import './SourcePanel.scss';

type SourcePanelProps = {
  isReadOnly?: boolean;
};

export const SourcePanel: FunctionComponent<SourcePanelProps> = ({ isReadOnly = false }) => {
  const { sourceBodyDocument } = useDataMapper();
  const { reloadNodeReferences } = useCanvas();

  return (
    <div id="panel-source" className="source-panel">
      <ExpansionPanels>
        <ExpansionPanel summary="Parameters" defaultHeight={100} onScroll={reloadNodeReferences}>
          <Parameters isReadOnly={isReadOnly} />
        </ExpansionPanel>

        <ExpansionPanel summary="Source" onScroll={reloadNodeReferences}>
          <SourceDocument document={sourceBodyDocument} isReadOnly={isReadOnly} />
        </ExpansionPanel>
      </ExpansionPanels>
    </div>
  );
};
