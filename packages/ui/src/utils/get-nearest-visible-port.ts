import { NodePath } from '../models/datamapper/nodepath';
import { TreeExpansionState } from '../store/document-tree.store';

/**
 * Finds the nearest visible connection port for a given node path.
 * If the exact node path doesn't have a connection port (i.e., it's collapsed),
 * walks up the parent hierarchy to find the first ancestor with a registered port.
 *
 * @param nodePath - The full path of the node (e.g., "SOURCE_BODY:customer://customer/address/zipcode")
 * @param connectionPortsMap - Map of registered connection ports
 * @param expansionStateMap - Map of document's nodes expansion state
 * @returns The position of the nearest visible port, or null if none found
 */
export function getNearestVisiblePort(
  nodePath: string,
  connectionPortsMap: Record<string, [number, number]>,
  expansionStateMap: Record<string, TreeExpansionState>,
): [number, number] | null {
  /* If the node is present in the connection port map, it's visible. (Not virtualized away nor collapsed) */
  if (connectionPortsMap[nodePath]) {
    return connectionPortsMap[nodePath];
  }

  const path = new NodePath(nodePath);
  const documentId = `doc-${path.documentType}-${path.documentId}`;

  while (path.pathSegments.length > 0) {
    // Remove the last segment to get the parent path
    path.pathSegments = path.pathSegments.slice(0, -1);
    const parentPath = path.toString();

    if (connectionPortsMap[parentPath] && !expansionStateMap[documentId][parentPath]) {
      return connectionPortsMap[parentPath];
    }
  }

  return connectionPortsMap['EDGE:top'];
}
