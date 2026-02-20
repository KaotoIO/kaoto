import { NodePath } from '../models/datamapper/nodepath';

/**
 * Finds the nearest visible connection port for a given node path.
 * If the exact node path doesn't have a connection port (i.e., it's collapsed),
 * walks up the parent hierarchy to find the first ancestor with a registered port.
 *
 * @param nodePath - The full path of the node (e.g., "SOURCE_BODY:customer://customer/address/zipcode")
 * @param connectionPorts - Map of registered connection ports
 * @returns The position of the nearest visible port, or null if none found
 */
export function getNearestVisiblePort(
  nodePath: string,
  connectionPorts: Record<string, [number, number]>,
): [number, number] | null {
  if (connectionPorts[nodePath]) {
    return connectionPorts[nodePath];
  }

  const path = new NodePath(nodePath);

  while (path.pathSegments.length > 0) {
    // Remove the last segment to get the parent path
    path.pathSegments = path.pathSegments.slice(0, -1);
    const parentPath = path.toString();

    if (connectionPorts[parentPath]) {
      return connectionPorts[parentPath];
    }
  }

  return null;
}
