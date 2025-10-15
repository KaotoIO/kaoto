import { Stack, StackItem, Panel, PanelMainBody } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { Parameters } from '../Document/Parameters';
import { SourceDocument } from '../Document/SourceDocument';
import './SourceTargetView.scss';

type SourcePanelProps = {
  isReadOnly?: boolean;
};

export const SourcePanel: FunctionComponent<SourcePanelProps> = ({ isReadOnly = false }) => {
  const { sourceBodyDocument } = useDataMapper();
  const { reloadNodeReferences } = useCanvas();

  return (
    <Panel id="panel-source" className="source-target-view__source-panel">
      <PanelMainBody className="source-target-view__source-panel-main-container">
        <Stack className="source-target-view__source-panel-main" hasGutter>
          <StackItem>
            <Parameters isReadOnly={isReadOnly} />
          </StackItem>
          <StackItem key={sourceBodyDocument.name} isFilled className="source-target-view__source-document-container">
            <SourceDocument
              document={sourceBodyDocument}
              isReadOnly={isReadOnly}
              customTitle="Source Body"
              onScroll={reloadNodeReferences}
            />
          </StackItem>
        </Stack>
      </PanelMainBody>
    </Panel>
  );
};
