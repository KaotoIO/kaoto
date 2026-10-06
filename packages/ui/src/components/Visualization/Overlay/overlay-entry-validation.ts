import { OverlayEntry, OverlayInteraction } from './overlay-entries';
import { OverlayTarget } from './overlay-targets';

const targetKinds: Record<OverlayEntry['kind'], readonly OverlayTarget['kind'][]> = {
  highlight: ['node', 'edge'],
  marker: ['node'],
  annotation: ['node', 'edge', 'route'],
};

function validateInteraction(interaction: OverlayInteraction): string | undefined {
  if (!interaction.accessibleLabel.trim()) return 'An accessible label is required';
  const actionIds = new Set<string>();
  for (const action of interaction.contextMenu ?? []) {
    if (!action.id || actionIds.has(action.id)) return 'Action IDs must be nonempty and unique within a menu';
    if (!action.label.trim()) return 'An action label is required';
    if (action.icon === '') return 'Action icons must be nonempty when supplied';
    actionIds.add(action.id);
  }
  return undefined;
}

/** Validate semantic constraints on typed internal entries, not untrusted transport payloads. */
export function validateOverlayEntries(entries: readonly OverlayEntry[]): string | undefined {
  const entryIds = new Set<string>();
  for (const entry of entries) {
    if (!entry.id || entryIds.has(entry.id)) return 'Entry IDs must be nonempty and unique within a batch';
    entryIds.add(entry.id);
    if (!targetKinds[entry.kind].includes(entry.target.kind)) return 'Unsupported target kind for this entry';
    if (entry.kind === 'marker' && !entry.icon) return 'A marker icon is required';
    if (entry.kind === 'annotation' && entry.value !== undefined && !Number.isFinite(entry.value)) {
      return 'Annotation values must be finite';
    }
    if (entry.kind !== 'highlight') {
      const reason = validateInteraction(entry.interaction);
      if (reason) return reason;
    }
  }
  return undefined;
}

export function cloneOverlayEntry(entry: OverlayEntry): OverlayEntry {
  const base = { id: entry.id, tone: entry.tone, emphasis: entry.emphasis };
  if (entry.kind === 'highlight') {
    return { ...base, kind: 'highlight', target: { kind: entry.target.kind, id: entry.target.id } };
  }
  const interaction: OverlayInteraction = {
    accessibleLabel: entry.interaction.accessibleLabel,
    tooltip: entry.interaction.tooltip,
    contextMenu: entry.interaction.contextMenu?.map((action) => ({
      id: action.id,
      label: action.label,
      icon: action.icon,
      enabled: action.enabled,
    })),
  };
  if (entry.kind === 'marker') {
    return { ...base, kind: 'marker', target: { kind: 'node', id: entry.target.id }, icon: entry.icon, interaction };
  }
  return {
    ...base,
    kind: 'annotation',
    target: { kind: entry.target.kind, id: entry.target.id },
    text: entry.text,
    value: entry.value,
    unit: entry.unit,
    interaction,
  };
}
