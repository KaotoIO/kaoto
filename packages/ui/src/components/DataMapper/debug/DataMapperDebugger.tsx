import { FunctionComponent, useMemo } from 'react';

import { DocumentDefinition, DocumentInitializationModel } from '../../../models/datamapper';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DatamapperDndProvider } from '../../../providers/datamapper-dnd.provider';
import { SourceTargetDnDHandler } from '../../../providers/dnd/SourceTargetDnDHandler';
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
  const dndHandler = useMemo(() => new SourceTargetDnDHandler(), []);

  return (
    <DataMapperProvider
      documentInitializationModel={documentInitializationModel}
      onUpdateDocument={onUpdateDocument}
      initialXsltFile={initialXsltFile}
      onUpdateMappings={onUpdateMappings}
    >
      <DatamapperDndProvider handler={dndHandler}>
        <MappingLinksProvider>
          <DebugLayout />
        </MappingLinksProvider>
      </DatamapperDndProvider>
    </DataMapperProvider>
  );
};
