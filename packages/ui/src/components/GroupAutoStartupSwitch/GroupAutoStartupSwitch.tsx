import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { Switch } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

import { useEntityContext } from '../../hooks/useEntityContext/useEntityContext';
import { CamelRouteVisualEntity, IVisualizationNode } from '../../models';

interface IGroupAutoStartupSwitchProps {
  vizNode?: IVisualizationNode;
}

/**
 * GroupAutoStartupSwitch component
 *
 * Renders a switch control for toggling the auto-startup property of a Camel Route.
 * Uses the vizNode's updateModel function to modify the route configuration.
 */
export const GroupAutoStartupSwitch: FunctionComponent<IGroupAutoStartupSwitchProps> = ({ vizNode }) => {
  const entitiesContext = useEntityContext();

  if (!vizNode) {
    return null;
  }

  const entity = vizNode.data.entity;
  if (!entity) {
    return null;
  }

  // Get the current autoStartup value from the route definition
  const routeDefinition: RouteDefinition = entity.getNodeDefinition(CamelRouteVisualEntity.ROOT_PATH);
  const autoStartupValue = routeDefinition?.autoStartup;

  // Only treat actual boolean false as disabled; strings (including "false" or placeholders like "{{...}}")
  // are considered non-boolean and should show as enabled since we can't determine their runtime value
  const isAutoStartup = autoStartupValue !== false;
  const title = isAutoStartup ? 'Auto Startup Enabled' : 'Auto Startup Disabled';

  const handleToggle = (event: React.FormEvent<HTMLInputElement>) => {
    event.stopPropagation();

    // Only toggle if the value is boolean or undefined; preserve string values
    if (typeof autoStartupValue === 'string') {
      return;
    }

    // Get the current route definition and update only the autoStartup property
    const updatedRoute = { ...routeDefinition };

    if (autoStartupValue === false) {
      // Remove the property to set it back to default (true)
      delete updatedRoute.autoStartup;
    } else {
      // Set to false (handles both undefined and true)
      updatedRoute.autoStartup = false;
    }

    // Use updateModel to modify the route configuration
    vizNode.updateModel(updatedRoute);
    entitiesContext.updateEntitiesFromCamelResource();
  };

  return (
    <div title={title} className="custom-group__autostart-container">
      <Switch
        className="custom-group__autostart-switch"
        aria-label="Auto Startup"
        isChecked={isAutoStartup}
        onChange={handleToggle}
        isReversed
      />
    </div>
  );
};

export default GroupAutoStartupSwitch;
