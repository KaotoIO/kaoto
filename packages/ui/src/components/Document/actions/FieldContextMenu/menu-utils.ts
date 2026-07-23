import { IField } from '../../../../models/datamapper/document';
import { IFieldMenuAction } from '../../../../models/datamapper/field-action';

function getFieldDisplayName(field: IField): string {
  return field.displayName || field.name;
}

/**
 * Builds the "Select 'X' in 'Y'" action shown for substitution candidates
 * and choice members that are not currently selected. Hooks call this to
 * create the entry that lets the user pick this specific field as the active
 * member/substitute from the parent wrapper's context menu.
 */
export function buildSelectSelfAction(
  memberField: IField | undefined,
  parentField: IField | undefined,
  onClick: () => void,
  testId: string,
  displayName: (field: IField) => string = getFieldDisplayName,
): IFieldMenuAction {
  const memberName = memberField ? displayName(memberField) : '';
  const parentName = parentField ? displayName(parentField) : undefined;
  return {
    label: parentName ? `Select '${memberName}' in '${parentName}'` : `Select '${memberName}'`,
    onClick,
    testId,
  };
}
