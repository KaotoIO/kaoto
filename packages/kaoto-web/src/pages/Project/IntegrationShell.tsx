import './IntegrationShell.scss';

import { FunctionComponent, useEffect } from 'react';
import { Navigate } from 'react-router';

import { findPath } from '../../components/Explorer/filterFiles';
import { useIntegrationHeader } from '../../context/IntegrationHeaderContext';
import { useSafeParams } from '../../hooks/useSafeParams';
import { STUB_FILES } from '../../stubs/explorer/index';

/**
 * IntegrationShell — rendered at `/projects/:projectId/integration/:integrationId`.
 *
 * Publishes breadcrumb into IntegrationHeaderContext so the Nav header shows the full
 * file path. View mode switcher (Design/Code/Topology) is rendered by ProjectToolbar.
 */
const IntegrationShell: FunctionComponent = () => {
  const params = useSafeParams(['projectId', 'integrationId']);
  const header = useIntegrationHeader();

  useEffect(() => {
    if (!params || !header) return;
    const path = findPath(STUB_FILES, params.integrationId);
    const breadcrumbItems = path
      ? path.slice(0, -1).map((node) => ({ label: node.name, href: `/projects/${params.projectId}` }))
      : [{ label: params.projectId, href: `/projects/${params.projectId}` }];
    const current = path ? path[path.length - 1].name : params.integrationId;
    header.setBreadcrumbItems(breadcrumbItems);
    header.setCurrent(current);
    // Reset view mode to Design when opening a different integration.
    header.setViewMode('design');
    return () => {
      header.setBreadcrumbItems([]);
      header.setCurrent('');
    };
    // `header` is a stable context reference (never changes identity); `STUB_FILES`
    // is a module-level constant. Neither needs to be in the dependency array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.projectId, params?.integrationId]);

  if (!params) return <Navigate to="/" replace />;

  return (
    <div className="cs--integration-shell" data-testid="integration-shell">
      <div className="cs--integration-shell__body" data-testid="integration-body" />
    </div>
  );
};

export default IntegrationShell;
