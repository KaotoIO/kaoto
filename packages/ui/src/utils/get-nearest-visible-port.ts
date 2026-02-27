import { NodePath } from '../models/datamapper/nodepath';
import { TreeExpansionState } from '../store/document-tree.store';

/**
 * Finds the nearest visible connection port for a given node path.
 * If the exact node path doesn't have a connection port (i.e., it's collapsed),
 * walks up the parent hierarchy to find the first ancestor with a registered port.
 *
 * @param path - The full path of the node (e.g., "SOURCE_BODY:customer://customer/address/zipcode")
 * @param connectionPortsMap - Map of registered connection ports
 * @param expansionStateMap - Map of document's nodes expansion state
 * @returns The position of the nearest visible port, or null if none found
 */
export function getNearestVisiblePort(
  path: string,
  connectionPortsMap: Record<string, [number, number]>,
  expansionStateMap: TreeExpansionState,
): { connectionTarget: 'node' | 'edge' | 'parent'; position: [number, number] } {
  /* If the node is present in the connection port map, it's visible. (Not virtualized away nor collapsed) */
  if (connectionPortsMap[path]) {
    return { connectionTarget: 'node', position: connectionPortsMap[path] };
  }

  const nodePath = new NodePath(path);

  while (nodePath.pathSegments.length > 0) {
    // Remove the last segment to get the parent path
    nodePath.pathSegments = nodePath.pathSegments.slice(0, -1);
    const parentPath = nodePath.toString();

    if (connectionPortsMap[parentPath] && !expansionStateMap[parentPath]) {
      return { connectionTarget: 'parent', position: connectionPortsMap[parentPath] };
    }
  }

  return { connectionTarget: 'edge', position: connectionPortsMap['EDGE:top'] };
}
