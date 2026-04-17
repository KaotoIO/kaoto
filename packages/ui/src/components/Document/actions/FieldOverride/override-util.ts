import { IField } from '../../../../models/datamapper/document';
import { FieldOverrideVariant } from '../../../../models/datamapper/types';
import { FieldOverrideService } from '../../../../services/field-override.service';
import { formatQNameWithPrefix, formatWithPrefix } from '../../../../services/namespace-util';

export interface OverrideDisplayInfo {
  originalLabel: string;
  currentLabel: string;
  original: string;
  current: string;
}

/**
 * Derive the display strings for an overridden field (type override or element substitution).
 * Returns `null` when the field has no active override.
 */
export function getOverrideDisplayInfo(
  field: IField,
  namespaceMap: Record<string, string>,
): OverrideDisplayInfo | null {
  if (field.typeOverride === FieldOverrideVariant.NONE) return null;

  if (field.typeOverride === FieldOverrideVariant.SUBSTITUTION) {
    return {
      originalLabel: 'Original element',
      currentLabel: 'Substituted element',
      original: field.originalField?.name ?? '?',
      current: field.name,
    };
  }

  return {
    originalLabel: 'Original type',
    currentLabel: 'Overridden type',
    original: formatQNameWithPrefix(
      field.originalField?.typeQName ?? field.typeQName,
      namespaceMap,
      field.originalField?.typeQName?.toString() || field.originalField?.type || field.type,
    ),
    current: formatQNameWithPrefix(field.typeQName, namespaceMap, field.typeQName?.toString() || field.type),
  };
}

export type OverrideMode = 'type' | 'substitution';

/** Minimal display shape shared by type and substitution candidates */
export type CandidateDisplay = { displayName: string; description?: string };

/** Derive the pre-selected key when opening the modal for a field with an existing override. */
export function derivePreselectedKey(
  field: IField,
  mode: OverrideMode,
  namespaceMap: Record<string, string>,
  candidates: Record<string, CandidateDisplay>,
): string | null {
  if (mode === 'substitution' && field.typeOverride === FieldOverrideVariant.SUBSTITUTION) {
    const key = formatWithPrefix(field.namespaceURI, field.name, namespaceMap);
    return key in candidates ? key : null;
  }
  if (
    mode === 'type' &&
    field.typeOverride !== FieldOverrideVariant.NONE &&
    field.typeOverride !== FieldOverrideVariant.SUBSTITUTION &&
    field.typeQName
  ) {
    const key = formatQNameWithPrefix(field.typeQName, namespaceMap);
    return key in candidates ? key : null;
  }
  return null;
}

/**
 * Load override candidates for the given mode and derive the pre-selected key.
 */
export function getOverrideCandidates(
  field: IField,
  mode: OverrideMode,
  namespaceMap: Record<string, string>,
): { candidates: Record<string, CandidateDisplay>; selectedKey: string | null } {
  const candidates =
    mode === 'substitution'
      ? FieldOverrideService.getFieldSubstitutionCandidates(field, namespaceMap)
      : FieldOverrideService.getSafeOverrideCandidates(field, namespaceMap);
  const selectedKey = derivePreselectedKey(field, mode, namespaceMap, candidates);
  return { candidates, selectedKey };
}
