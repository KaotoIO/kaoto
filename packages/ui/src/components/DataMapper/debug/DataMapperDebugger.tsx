import { FunctionComponent } from 'react';

import { DocumentDefinition, DocumentInitializationModel } from '../../../models/datamapper';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { DebugLayout } from './DebugLayout';

type DataMapperDebuggerProps = {
  documentInitializationModel?: DocumentInitializationModel;
  onUpdateDocument?: (definition: DocumentDefinition) => void;
  initialXsltFile?: string;
  onUpdateMappings?: (xsltFile: string) => void;
};

export const DataMapperDebugger: FunctionComponent<DataMapperDebuggerProps> = ({
  documentInitializationModel,
  onUpdateDocument,
  initialXsltFile,
  onUpdateMappings,
}) => {
  return (
    <DataMapperProvider
      documentInitializationModel={documentInitializationModel}
      onUpdateDocument={onUpdateDocument}
      initialXsltFile={initialXsltFile}
      onUpdateMappings={onUpdateMappings}
    >
      <DataMapperCanvasProvider>
        <DebugLayout />
      </DataMapperCanvasProvider>
    </DataMapperProvider>
  );
};
