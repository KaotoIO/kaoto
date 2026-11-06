import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first

import { createRoot } from 'react-dom/client';

import { DocumentDefinition } from '../../../models/datamapper/document';
import { DataMapperDebugger } from './DataMapperDebugger';

const onUpdateMappings = (xsltFile: string) => {
  console.log('onUpdateMappings() >>>>> ' + xsltFile);
};
const onUpdateDocument = (definition: DocumentDefinition): undefined => {
  console.log('onUpdateDocument() >>>>>', JSON.stringify(definition));
  return undefined;
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<DataMapperDebugger onUpdateMappings={onUpdateMappings} onUpdateDocument={onUpdateDocument} />);
