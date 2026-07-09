import { IField } from '../../../models/datamapper/document';
import {
  AddMappingNodeData,
  FieldItemNodeData,
  FieldNodeData,
  NodeData,
} from '../../../models/datamapper/visualization';
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

export const prepareFieldDetails = (
  field: IField,
  namespaceMap: Record<string, string> = {},
  cardinalityField: IField = field,
): LabelValuePair[] => {
  const overrideDisplay = getOverrideDisplayInfo(field, namespaceMap);

  const rows = [
    { label: 'Category', value: field.type },
    { label: 'Type', value: formatTypeQName(field.typeQName) },
    {
      label: 'Min Occurs',
      value:
        cardinalityField.minOccurs !== null && cardinalityField.minOccurs !== undefined
          ? String(cardinalityField.minOccurs)
          : null,
    },
    {
      label: 'Max Occurs',
      value:
        cardinalityField.maxOccurs !== null && cardinalityField.maxOccurs !== undefined
          ? String(cardinalityField.maxOccurs)
          : null,
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
