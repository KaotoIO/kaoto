// PatternFly styles for the RouteVisualization canvas; the no-reset variant leaves Carbon's reset untouched
import '@patternfly/react-core/dist/styles/base-no-reset.css';
import './IntegrationShell.scss';

import { RouteVisualization } from '@kaoto/kaoto/components';
import { FunctionComponent, useEffect, useState } from 'react';
import { Navigate } from 'react-router';

import { findPath } from '../../components/Explorer/filterFiles';
import { useIntegrationHeader } from '../../context/IntegrationHeaderContext';
import { useSafeParams } from '../../hooks/useSafeParams';
import { STUB_FILES } from '../../stubs/explorer/index';
import { getStubIntegrationContent } from '../../stubs/integrations';

/** Absolute so that the catalog also resolves on nested routes such as `/projects/:id/integration/:id` */
const CATALOG_URL = `${import.meta.env.BASE_URL}camel-catalog/index.json`;

/**
 * Holds the edited code locally until the integrations are backed by a real file store.
 *
 * The canvas stays mounted across integrations: re-mounting it would tear down the providers inside
 * RouteVisualization and download the whole Camel catalog again. The local code is reset instead.
 */
const IntegrationCanvas: FunctionComponent<{ integrationId: string; initialCode: string }> = ({
  integrationId,
  initialCode,
}) => {
  const [code, setCode] = useState(initialCode);
  const [codeOwner, setCodeOwner] = useState(integrationId);
  if (codeOwner !== integrationId) {
    // Adjust state while rendering (https://react.dev/learn/you-might-not-need-an-effect)
    setCodeOwner(integrationId);
    setCode(initialCode);
  }

  return (
    <RouteVisualization
      className="cs--integration-shell__canvas"
      catalogUrl={CATALOG_URL}
      runtimeCatalogName=""
      testingCatalogName=""
      code={code}
      codeChange={setCode}
    />
  );
};

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

  const content = getStubIntegrationContent(params.integrationId);
  const isDesignMode = (header?.viewMode ?? 'design') === 'design';

  return (
    <div className="cs--integration-shell" data-testid="integration-shell">
      <div className="cs--integration-shell__body" data-testid="integration-body">
        {isDesignMode &&
          (content === undefined ? (
            <p className="cs--integration-shell__empty">No preview available</p>
          ) : (
            <IntegrationCanvas integrationId={params.integrationId} initialCode={content} />
          ))}
      </div>
    </div>
  );
};

export default IntegrationShell;
