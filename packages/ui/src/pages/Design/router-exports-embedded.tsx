import { ContextToolbar } from '../../components/Visualization/ContextToolbar';
import { DesignPage } from './DesignPage';

/** The Design page of an editor embedded in a host such as VS Code. The host owns the file type and the runtime selection. */
export const Component = () => <DesignPage contextToolbar={<ContextToolbar isSimplified />} />;
