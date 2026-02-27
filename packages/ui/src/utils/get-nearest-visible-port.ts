import { NodePath } from '../models/datamapper/nodepath';
import { TreeConnectionPorts, TreeExpansionState } from '../store/document-tree.store';

/**
 * Finds the nearest visible connection port for a given node path.
 * If the exact node path doesn't have a connection port (i.e., it's collapsed),
 * walks up the parent hierarchy to find the first ancestor with a registered port.
 *
 * @param path - The full path of the node (e.g., "SOURCE_BODY:customer://customer/address/zipcode")
 * @param nodesConnectionPorts - Map of registered connection ports
 * @param expansionState - Map of document's nodes expansion state
 * @returns The position of the nearest visible port, or null if none found
 */
export function getNearestVisiblePort(
  path: string,
  options: {
    nodesConnectionPorts: TreeConnectionPorts;
    nodesConnectionPortsArray: string[];
    expansionState: TreeExpansionState;
    expansionStateArray: string[];
  },
): { connectionTarget: 'node' | 'edge' | 'parent'; position: [number, number] } {
  const { nodesConnectionPorts, nodesConnectionPortsArray, expansionState, expansionStateArray } = options;

  /* If the document's connection ports don't exist, return edge bottom fallback */
  if (!nodesConnectionPorts || !nodesConnectionPorts['EDGE:bottom']) {
    return { connectionTarget: 'edge', position: [0, 0] };
  }

  /* If the node is present in the connection port map, it's visible. (Not virtualized away nor collapsed) */
  if (nodesConnectionPorts[path]) {
    return { connectionTarget: 'node', position: nodesConnectionPorts[path] };
  }

  const nodePath = new NodePath(path);

  while (nodePath.pathSegments.length > 0) {
    // Remove the last segment to get the parent path
    nodePath.pathSegments = nodePath.pathSegments.slice(0, -1);
    const parentPath = nodePath.toString();

    if (nodesConnectionPorts[parentPath] && !expansionState[parentPath]) {
      return { connectionTarget: 'parent', position: nodesConnectionPorts[parentPath] };
    }
  }

  const firstVisiblePath = nodesConnectionPortsArray.at(0);
  const lastVisiblePath = nodesConnectionPortsArray.at(-1);
  const pathIndex = expansionStateArray.indexOf(path);

  if (!firstVisiblePath || lastVisiblePath || pathIndex < 0) {
    return { connectionTarget: 'edge', position: nodesConnectionPorts['EDGE:bottom'] };
  }

  if (pathIndex < expansionStateArray.indexOf(firstVisiblePath)) {
    return { connectionTarget: 'edge', position: nodesConnectionPorts['EDGE:top'] };
  }

  return { connectionTarget: 'edge', position: nodesConnectionPorts['EDGE:bottom'] };
}
