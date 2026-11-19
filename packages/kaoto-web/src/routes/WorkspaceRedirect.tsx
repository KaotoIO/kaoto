import { Navigate } from 'react-router';

/** kaoto-web starts in the workspace. Replaces the history entry, so Back does not return to the redirect. */
const WorkspaceRedirect = () => <Navigate to="/workspace" replace />;

export default WorkspaceRedirect;
