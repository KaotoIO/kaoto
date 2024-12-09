import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first
import { createRoot } from 'react-dom/client';
import { DataMapperDebugger } from './DataMapperDebugger';
import { DocumentDefinition } from '../../../models/datamapper/document';

const onUpdateMappings = (xsltFile: string) => {
  console.log('onUpdateMappings() >>>>> ' + xsltFile);
};
const onUpdateDocument = (definition: DocumentDefinition) => {
  console.log('onUpdateDocument() >>>>>', JSON.stringify(definition));
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<DataMapperDebugger onUpdateMappings={onUpdateMappings} onUpdateDocument={onUpdateDocument} />);
