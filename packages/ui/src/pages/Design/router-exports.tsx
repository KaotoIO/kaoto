import { ContextToolbar } from '../../components/Visualization/ContextToolbar/ContextToolbar';
import { DesignPage } from './DesignPage';
import { ReturnToSourceCodeFallback } from './ReturnToSourceCodeFallback';

export const Component = () => (
  <DesignPage fallback={<ReturnToSourceCodeFallback />} contextToolbar={<ContextToolbar />} />
);
