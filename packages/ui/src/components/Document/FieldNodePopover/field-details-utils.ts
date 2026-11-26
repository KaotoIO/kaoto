import { IField } from '../../../models/datamapper/document';
import {
  AddMappingNodeData,
  CopyOfFieldNodeData,
  FieldItemNodeData,
  FieldNodeData,
  NodeData,
} from '../../../models/datamapper/visualization';
import { DocumentService } from '../../../services/document/document.service';
import { MaxOccursType } from '../../../xml-schema-ts/constants';
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

const formatOccurs = (value: MaxOccursType | null | undefined): string | null =>
  value === null || value === undefined ? null : String(value);

/**
 * Builds the rows of the field details popover.
 *
 * Min Occurs and Max Occurs show the field's own occurrence. Effective Min Occurs and Effective Max Occurs show
 * how often the field can occur in its nearest real ancestor element, and are shown together whenever either
 * value differs from the own one. Both come from {@link DocumentService.getCardinality}, the same resolver the
 * collection icon, the collection-gated mapping actions and the automatic `for-each` read, so the popover never
 * contradicts them. They depend only on the field, never on the node class that shows it.
 * @param field - The field the popover describes
 * @param namespaceMap - Prefix to namespace URI map, used to display overrides
 * @param nodeData - The node the popover belongs to; only used for the optional guard row
 * @returns the label/value rows to display, without the rows that have no value
 */
export const prepareFieldDetails = (
  field: IField,
  namespaceMap: Record<string, string> = {},
  nodeData?: NodeData,
): LabelValuePair[] => {
  const overrideDisplay = getOverrideDisplayInfo(field, namespaceMap);
  const { own, effective } = DocumentService.getCardinality(field);
  const ownMinOccurs = formatOccurs(own.minOccurs);
  const ownMaxOccurs = formatOccurs(own.maxOccurs);
  const showEffective =
    ownMinOccurs !== null &&
    ownMaxOccurs !== null &&
    (own.minOccurs !== effective.minOccurs || own.maxOccurs !== effective.maxOccurs);
  const optionalGuard =
    nodeData instanceof FieldItemNodeData || nodeData instanceof CopyOfFieldNodeData
      ? nodeData.autoOptionalIfItem
      : undefined;

  const rows = [
    { label: 'Category', value: field.type },
    { label: 'Type', value: formatTypeQName(field.typeQName) },
    { label: 'Min Occurs', value: ownMinOccurs },
    { label: 'Max Occurs', value: ownMaxOccurs },
    { label: 'Effective Min Occurs', value: showEffective ? formatOccurs(effective.minOccurs) : null },
    { label: 'Effective Max Occurs', value: showEffective ? formatOccurs(effective.maxOccurs) : null },
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
