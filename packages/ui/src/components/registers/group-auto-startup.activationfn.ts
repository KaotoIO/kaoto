import { IVisualizationNode } from '../../models/visualization/base-visual-entity';

/**
 * Activation function for the GroupAutoStartupSwitch component.
 * Returns true if the visualization node represents a Camel Route that supports auto-startup configuration.
 */
export const groupAutoStartupActivationFn = (vizNode: IVisualizationNode): boolean => {
  if (!vizNode) {
    return false;
  }

  // Check if this is a group node (routes are rendered as groups)
  if (!vizNode.data.isGroup) {
    return false;
  }

  // Check if the entity has a route definition with autoStartup property
  const entity = vizNode.data.entity;
  if (!entity) {
    return false;
  }

  // Check if this is a route entity by checking the root path
  const rootPath = entity.getRootPath();
  if (rootPath !== 'route') {
    return false;
  }

  return true;
};
