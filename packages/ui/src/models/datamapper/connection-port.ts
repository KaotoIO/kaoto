import { DocumentType } from './document';
import { VARIABLE_PATH_SCHEME, VARIABLES_DOCUMENT_ID } from './nodepath';

/**
 * Addresses a single connection port in the `useDocumentTreeStore` registry, which is keyed
 * `nodesConnectionPorts[documentNodeId][nodePath]`. Pairing the two halves in one value keeps
 * callers from combining a document node ID with a node path that belongs to a different section.
 */
export interface ConnectionPortRef {
  documentNodeId: string;
  nodePath: string;
}

/**
 * Document node ID of the parameters section header.
 *
 * Unlike the per-parameter node IDs produced by `DocumentNodeData.getId`, this identifies no
 * document at all - the section header is a port registry bucket of its own so that its anchor
 * survives when every parameter panel is unmounted.
 */
export const PARAMETERS_HEADER_DOCUMENT_NODE_ID = '_parameters_header';

/**
 * Where a source-side mapping line terminates while the parameters section is hidden.
 * Registered by `ParametersHeader`, which outlives the parameter panels themselves.
 */
export const PARAMETERS_SECTION_ANCHOR: ConnectionPortRef = {
  documentNodeId: PARAMETERS_HEADER_DOCUMENT_NODE_ID,
  nodePath: `${DocumentType.PARAM}:${PARAMETERS_HEADER_DOCUMENT_NODE_ID}://`,
};

/**
 * Where a source-side mapping line terminates while the variables section is hidden.
 * Registered by `VariablesHeader`, which stays mounted when the variable rows are collapsed away.
 */
export const VARIABLES_SECTION_ANCHOR: ConnectionPortRef = {
  documentNodeId: VARIABLES_DOCUMENT_ID,
  nodePath: `${VARIABLE_PATH_SCHEME}:${VARIABLES_DOCUMENT_ID}://`,
};

/**
 * Maps a source document to the section anchor its mapping lines retract to when that section is
 * collapsed or hidden. Body documents have no collapsible section and therefore no anchor.
 *
 * This is the single place that relates a {@link DocumentType} to a section, replacing document node
 * ID prefix sniffing in the presentation layer.
 */
export function getSectionAnchor(documentType: DocumentType): ConnectionPortRef | undefined {
  return documentType === DocumentType.PARAM ? PARAMETERS_SECTION_ANCHOR : undefined;
}
