import { FunctionComponent } from 'react';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { IDataMapperProps } from '../../../pages/DataMapper/DataMapperPage';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { DebugLayout } from './DebugLayout';

export const DataMapperDebugger: FunctionComponent<IDataMapperProps> = ({
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
