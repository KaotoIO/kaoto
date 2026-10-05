import './IntegrationShell.scss';

import { ContentSwitcher, Switch } from '@carbon/react';
import { FunctionComponent, useState } from 'react';
import { Navigate } from 'react-router';

import { Breadcrumbs } from '../../components/Breadcrumbs/Breadcrumbs';
import { useSafeParams } from '../../hooks/useSafeParams';

type ViewMode = 'design' | 'code' | 'topology';

/**
 * IntegrationShell — rendered at `/projects/:projectId/integration/:integrationId`.
 *
 * Secondary toolbar: breadcrumb (left) + ContentSwitcher Design/Code/Topology (right).
 * Body: placeholder div ready for future canvas / editor panels.
 */
const IntegrationShell: FunctionComponent = () => {
  const params = useSafeParams(['projectId', 'integrationId']);
  const [viewMode, setViewMode] = useState<ViewMode>('design');

  if (!params) return <Navigate to="/" replace />;

  const { projectId, integrationId } = params;

  const breadcrumbItems = [{ label: projectId, href: `/projects/${projectId}` }];

  return (
    <div className="cs--integration-shell" data-testid="integration-shell">
      {/* Secondary toolbar */}
      <div className="cs--integration-shell__toolbar" data-testid="integration-shell-toolbar">
        <Breadcrumbs items={breadcrumbItems} current={integrationId} />

        <ContentSwitcher
          size="sm"
          className="cs--integration-shell__switcher"
          selectedIndex={['design', 'code', 'topology'].indexOf(viewMode)}
          onChange={({ name }) => {
            setViewMode(name as ViewMode);
          }}
          data-testid="integration-shell-switcher"
        >
          <Switch name="design" text="Design" data-testid="view-mode-design" />
          <Switch name="code" text="Code" data-testid="view-mode-code" />
          <Switch name="topology" text="Topology" data-testid="view-mode-topology" />
        </ContentSwitcher>
      </div>

      {/* Body placeholder */}
      <div className="cs--integration-shell__body" data-testid="integration-body" />
    </div>
  );
};

export default IntegrationShell;
