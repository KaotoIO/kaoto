import { IField } from '../../../models/datamapper/document';
import {
  AddMappingNodeData,
  CopyOfFieldNodeData,
  FieldItemNodeData,
  FieldNodeData,
  NodeData,
} from '../../../models/datamapper/visualization';
import { VisualizationUtilService } from '../../../services/visualization/visualization-util.service';
import { QName } from '../../../xml-schema-ts/QName';
import { getOverrideDisplayInfo } from '../actions/FieldOverride/override-util';

export const isFieldNode = (nodeData: NodeData): boolean => {
  return (
    nodeData instanceof FieldNodeData ||
    nodeData instanceof FieldItemNodeData ||
    nodeData instanceof CopyOfFieldNodeData ||
    nodeData instanceof AddMappingNodeData
  );
};

export interface LabelValuePair {
  label: string;
  value: string;
}

/** Label of the field details row that explains a see-through optional guard. */
export const OPTIONAL_GUARD_LABEL = 'Optional guard';

/**
 * Explains a see-through optional guard. The guarded occurrence badge shows it on hover, and the
 * field details popover shows it as a row, which is how keyboard users reach it: the badge isn't
 * focusable.
 * @param guardTest - the guard's test, the source path whose existence decides whether the field is
 *   written
 */
export const getOptionalGuardExplanation = (guardTest: string): string =>
  `This field is written only when ${guardTest} exists in the source. The guarding if is hidden. ` +
  'Changing the XPath to anything other than a simple path to an optional source shows the if. ' +
  'To always write the field: ⋮ → Remove optional guard.';

export const formatTypeQName = (typeQName: QName | null): string => {
  if (!typeQName) return 'N/A';

  const localPart = typeQName.getLocalPart() ?? 'N/A';
  const namespaceURI = typeQName.getNamespaceURI();

  return namespaceURI ? `${localPart} (${namespaceURI})` : localPart;
};

/**
 * Returns the effective maxOccurs for display in the field details popover.
 *
 * The popover reads the same cardinality as the collection icon and the collection-gated mapping actions,
 * so the Max Occurs row never contradicts them on the same row.
 *
 * Resolution order:
 *
 * 1. **No `nodeData`** — returns `field.maxOccurs`.
 *
 * 2. **A node that shows a field** — returns the `maxOccurs` of
 *    {@link VisualizationUtilService.getEffectiveCardinality}: that of the outermost repeating
 *    choice, sequence or abstract wrapper between the field and its nearest real element, or the field's own
 *    `maxOccurs` when no wrapper repeats. Only the field's ancestor chain is read, so a wrapper back-reference
 *    on the node (`wrapperField`, `choiceField`, `abstractField`) or the parent row never changes the value.
 *
 * 3. **A node that shows no field** — returns `field.maxOccurs`. The popover renders nothing for such a node.
 *
 * @param field    - The `IField` associated with the popover node. Its `maxOccurs` is used only when `nodeData` is
 *                   absent or shows no field.
 * @param nodeData - Optional visualization node; when absent the raw field value is used.
 */
export const getEffectiveMaxOccurs = (field: IField, nodeData?: NodeData): IField['maxOccurs'] => {
  const effectiveCardinality = nodeData ? VisualizationUtilService.getEffectiveCardinality(nodeData) : undefined;
  return effectiveCardinality?.maxOccurs ?? field.maxOccurs;
};

export const prepareFieldDetails = (
  field: IField,
  namespaceMap: Record<string, string> = {},
  nodeData?: NodeData,
): LabelValuePair[] => {
  const overrideDisplay = getOverrideDisplayInfo(field, namespaceMap);
  const effectiveMaxOccurs = getEffectiveMaxOccurs(field, nodeData);
  const optionalGuard =
    nodeData instanceof FieldItemNodeData || nodeData instanceof CopyOfFieldNodeData
      ? nodeData.autoOptionalIfItem
      : undefined;

  const rows = [
    { label: 'Category', value: field.type },
    { label: 'Type', value: formatTypeQName(field.typeQName) },
    {
      label: 'Min Occurs',
      value: field.minOccurs !== null && field.minOccurs !== undefined ? String(field.minOccurs) : null,
    },
    {
      label: 'Max Occurs',
      value: effectiveMaxOccurs !== null && effectiveMaxOccurs !== undefined ? String(effectiveMaxOccurs) : null,
    },
    {
      label: OPTIONAL_GUARD_LABEL,
      value: optionalGuard ? getOptionalGuardExplanation(optionalGuard.expression) : null,
    },
    { label: 'Namespace', value: field.namespaceURI },
    { label: 'Attribute', value: field.isAttribute ? 'yes' : null },
    { label: 'Nillable', value: field.nillable ? 'yes' : null },
    { label: 'Wrapper Kind', value: field.wrapperKind },

    ...(overrideDisplay
      ? [
          { label: overrideDisplay.originalLabel, value: overrideDisplay.original },
          { label: overrideDisplay.currentLabel, value: overrideDisplay.current },
        ]
      : []),

    { label: 'Description', value: field.description },
  ];

  return rows
    .map((row) => ({
      label: row.label,
      value: row.value === '' ? 'N/A' : row.value,
    }))
    .filter((row): row is LabelValuePair => row.value !== null && row.value !== undefined);
};
