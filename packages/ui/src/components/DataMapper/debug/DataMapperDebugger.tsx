import { FunctionComponent } from 'react';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { DebugLayout } from './DebugLayout';
import { DocumentDefinition, DocumentInitializationModel } from '../../../models/datamapper';

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
