import { NodePath } from '../models/datamapper/nodepath';
import { TreeConnectionPorts, TreeExpansionState } from '../store/document-tree.store';

export interface NearestVisiblePortOptions {
  nodesConnectionPorts: TreeConnectionPorts;
  nodesConnectionPortsArray: string[];
  expansionState: TreeExpansionState;
  expansionStateArray: string[];
  sectionAnchorPort?: [number, number];
}

/**
 * Finds the nearest visible connection port for a given node path.
 * If the exact node path doesn't have a connection port (i.e., it's collapsed),
 * walks up the parent hierarchy to find the first ancestor with a registered port.
 *
 * @param path - The full path of the node (e.g., "sourceBody:customer://customer/address/zipcode")
 * @param nodesConnectionPorts - Map of registered connection ports
 * @param expansionState - Map of document's nodes expansion state
 * @returns The position of the nearest visible port, or null if none found
 */
export function getNearestVisiblePort(
  path: string,
  options: NearestVisiblePortOptions,
): { connectionTarget: 'node' | 'edge' | 'parent'; position: [number, number] } {
  const { nodesConnectionPorts, nodesConnectionPortsArray, expansionState, expansionStateArray } = options;

  /*
   * A missing edge marker means the whole section unmounted and `useConnectionPortSync` cleared its
   * port map, so no exact node port can exist either - hence this runs ahead of the lookup below.
   * The section anchor, registered by the still-mounted section header, is the only port left.
   */
  if (!nodesConnectionPorts?.edges?.bottom) {
    if (options.sectionAnchorPort) {
      return { connectionTarget: 'parent', position: options.sectionAnchorPort };
    }
    return { connectionTarget: 'edge', position: [0, 0] };
  }

  /* If the node is present in the connection port map, it's visible. (Not virtualized away nor collapsed) */
  if (nodesConnectionPorts.nodes[path]) {
    return { connectionTarget: 'node', position: nodesConnectionPorts.nodes[path] };
  }

  const nodePath = new NodePath(path);
  while (nodePath.pathSegments.length > 0) {
    // Remove the last segment to get the parent path
    nodePath.pathSegments = nodePath.pathSegments.slice(0, -1);
    const parentPath = nodePath.toString();

    if (nodesConnectionPorts.nodes[parentPath] && !expansionState[parentPath]) {
      return { connectionTarget: 'parent', position: nodesConnectionPorts.nodes[parentPath] };
    }
  }
  /*
   * No ports && no expansion states means this is a primitive document (header-only,
   * e.g. a schema-less parameter). Its only port lives in `.expansion-panel__summary` and,
   * since it isn't registered here, it's currently scrolled out of the outer
   * `.expansion-panels` viewport (a visible port would have matched the check above) -
   * so it must be treated the same as any other out-of-view node.
   */
  if (nodesConnectionPortsArray.length === 0 && expansionStateArray.length === 0) {
    return { connectionTarget: 'edge', position: nodesConnectionPorts.edges.bottom };
  }

  const firstVisiblePath = nodesConnectionPortsArray.at(0);
  const lastVisiblePath = nodesConnectionPortsArray.at(-1);
  const pathIndex = expansionStateArray.indexOf(path);

  if (!firstVisiblePath || !lastVisiblePath || pathIndex < 0) {
    return { connectionTarget: 'edge', position: nodesConnectionPorts.edges.bottom };
  }

  if (pathIndex < expansionStateArray.indexOf(firstVisiblePath)) {
    return { connectionTarget: 'edge', position: nodesConnectionPorts.edges.top ?? nodesConnectionPorts.edges.bottom };
  }

  return { connectionTarget: 'edge', position: nodesConnectionPorts.edges.bottom };
}
