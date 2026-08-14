import { IField } from '../../../models/datamapper/document';
import {
  AddMappingNodeData,
  FieldItemNodeData,
  FieldNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
} from '../../../models/datamapper/visualization';
import { VisualizationUtilService } from '../../../services/visualization/visualization-util.service';
import { QName } from '../../../xml-schema-ts/QName';
import { getOverrideDisplayInfo } from '../actions/FieldOverride/override-util';

export const isFieldNode = (nodeData: NodeData): boolean => {
  return (
    nodeData instanceof FieldNodeData || nodeData instanceof FieldItemNodeData || nodeData instanceof AddMappingNodeData
  );
};

export interface LabelValuePair {
  label: string;
  value: string;
}

export const formatTypeQName = (typeQName: QName | null): string => {
  if (!typeQName) return 'N/A';

  const localPart = typeQName.getLocalPart() ?? 'N/A';
  const namespaceURI = typeQName.getNamespaceURI();

  return namespaceURI ? `${localPart} (${namespaceURI})` : localPart;
};

/**
 * Returns the effective maxOccurs for display in the field details popover.
 *
 * A selected choice member (or abstract substitution member) inherits its
 * collection cardinality from the parent wrapper. In that case the member
 * field's own maxOccurs is always 1, while the wrapper's maxOccurs carries
 * the actual repeating constraint.
 *
 * Resolution order:
 *
 * 1. **No `nodeData`** — returns `field.maxOccurs` directly.
 *
 * 2. **`FieldItemNodeData` with `wrapperField` set** — target-side collection
 *    member whose wrapper was resolved at node-construction time; returns
 *    `wrapperField.maxOccurs`.
 *
 * 3. **`FieldItemNodeData` without `wrapperField`, parent is `TargetChoiceFieldNodeData`
 *    or `TargetAbstractFieldNodeData`** — fallback for the case where
 *    `VisualizationService.findWrapperFieldForFieldItem` returned `undefined`
 *    but the parent node itself carries the wrapper's `IField`; returns
 *    `parent.field.maxOccurs`.
 *
 * 4. **`ChoiceFieldNodeData` / `TargetChoiceFieldNodeData` with `choiceField` set** —
 *    source or target selected choice member; returns `choiceField.maxOccurs`.
 *
 * 5. **`AbstractFieldNodeData` / `TargetAbstractFieldNodeData` with `abstractField` set** —
 *    source or target selected abstract substitution member; returns `abstractField.maxOccurs`.
 *
 * 6. **All other nodes** (plain `FieldNodeData`, `TargetFieldNodeData`, unselected
 *    choice/abstract wrappers, `AddMappingNodeData`, etc.) — returns `field.maxOccurs`.
 *
 * @param field    - The `IField` associated with the popover node.
 * @param nodeData - Optional visualization node; when absent the raw field value is used.
 */
export const getEffectiveMaxOccurs = (field: IField, nodeData?: NodeData): IField['maxOccurs'] => {
  if (!nodeData) {
    return field.maxOccurs;
  }

  if (nodeData instanceof FieldItemNodeData) {
    if (nodeData.wrapperField) {
      return nodeData.wrapperField.maxOccurs;
    }

    if (
      nodeData.parent instanceof TargetChoiceFieldNodeData ||
      nodeData.parent instanceof TargetAbstractFieldNodeData
    ) {
      return nodeData.parent.field.maxOccurs;
    }
  }

  if (VisualizationUtilService.isChoiceField(nodeData) && nodeData.choiceField) {
    return nodeData.choiceField.maxOccurs;
  }

  if (VisualizationUtilService.isAbstractField(nodeData) && nodeData.abstractField) {
    return nodeData.abstractField.maxOccurs;
  }

  return field.maxOccurs;
};

export const prepareFieldDetails = (
  field: IField,
  namespaceMap: Record<string, string> = {},
  nodeData?: NodeData,
): LabelValuePair[] => {
  const overrideDisplay = getOverrideDisplayInfo(field, namespaceMap);
  const effectiveMaxOccurs = getEffectiveMaxOccurs(field, nodeData);

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
