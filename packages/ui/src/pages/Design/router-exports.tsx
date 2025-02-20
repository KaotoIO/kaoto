import { DesignPage } from './DesignPage';
import { ReturnToSourceCodeFallback } from './ReturnToSourceCodeFallback';
import { SerializerSelector } from '../../components/Visualization/ContextToolbar/SerializerSelector/SerializerSelector';

export const element = (
  <DesignPage
    fallback={<ReturnToSourceCodeFallback />}
    additionalToolbarControls={[<SerializerSelector key="serializerSelector" />]}
  />
);
