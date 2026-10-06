import { OverlayEntry } from './overlay-entries';
import { cloneOverlayEntry, validateOverlayEntries } from './overlay-entry-validation';

const marker = (): Extract<OverlayEntry, { kind: 'marker' }> => ({
  id: 'marker',
  kind: 'marker',
  target: { kind: 'node', id: 'route|log' },
  icon: 'circle',
  emphasis: 'subdued',
  interaction: {
    accessibleLabel: 'Step marker',
    tooltip: '',
    contextMenu: [{ id: 'toggle', label: 'Toggle marker', enabled: false, icon: 'toggle' }],
  },
});

const annotation = (): Extract<OverlayEntry, { kind: 'annotation' }> => ({
  id: 'annotation',
  kind: 'annotation',
  target: { kind: 'route', id: 'route' },
  text: '',
  value: 0,
  unit: '',
  interaction: { accessibleLabel: 'Message count' },
});

describe('validateOverlayEntries', () => {
  it('accepts mixed presentation entries and independent action IDs', () => {
    expect(
      validateOverlayEntries([
        { id: 'node', kind: 'highlight', target: { kind: 'node', id: 'route|log' }, tone: 'warning' },
        { id: 'edge', kind: 'highlight', target: { kind: 'edge', id: 'route|a >>> b' } },
        marker(),
        { ...marker(), id: 'second-marker', icon: 'diamond', emphasis: 'normal' },
        annotation(),
        { ...annotation(), id: 'edge-count', target: { kind: 'edge', id: 'route|a >>> b' }, value: -1 },
        { ...annotation(), id: 'node-count', target: { kind: 'node', id: 'route|log' } },
      ]),
    ).toBeUndefined();
    expect(validateOverlayEntries([])).toBeUndefined();
  });

  it.each([
    ['empty entry ID', () => [{ ...marker(), id: '' }]],
    ['duplicate ID across kinds', () => [marker(), { ...annotation(), id: 'marker' }]],
    ['empty marker icon', () => [{ ...marker(), icon: '' }]],
    ['blank accessible label', () => [{ ...annotation(), interaction: { accessibleLabel: ' \t' } }]],
    ['blank marker label', () => [{ ...marker(), interaction: { accessibleLabel: '' } }]],
    [
      'duplicate menu ID',
      () => {
        const entry = marker();
        entry.interaction.contextMenu!.push({ id: 'toggle', label: 'Other action', enabled: true });
        return [entry];
      },
    ],
    [
      'empty action ID',
      () => {
        const entry = marker();
        entry.interaction.contextMenu![0].id = '';
        return [entry];
      },
    ],
    [
      'blank action label',
      () => {
        const entry = marker();
        entry.interaction.contextMenu![0].label = '  ';
        return [entry];
      },
    ],
    [
      'empty action icon',
      () => {
        const entry = marker();
        entry.interaction.contextMenu![0].icon = '';
        return [entry];
      },
    ],
    ['NaN value', () => [{ ...annotation(), value: Number.NaN }]],
    ['infinite value', () => [{ ...annotation(), value: Number.POSITIVE_INFINITY }]],
    ['negative infinite value', () => [{ ...annotation(), value: Number.NEGATIVE_INFINITY }]],
  ] satisfies [string, () => OverlayEntry[]][])('rejects %s', (_name, entries) => {
    expect(validateOverlayEntries(entries())).toEqual(expect.any(String));
  });

  it.each([
    ['marker', 'edge'],
    ['marker', 'route'],
    ['highlight', 'route'],
  ])('rejects a %s on a %s target', (kind, targetKind) => {
    const entry = { ...marker(), kind, target: { kind: targetKind, id: 'target' } } as OverlayEntry;
    expect(validateOverlayEntries([entry])).toEqual(expect.any(String));
  });
});

describe('cloneOverlayEntry', () => {
  it('detaches nested marker interactions and preserves disabled actions', () => {
    const input = marker();
    const copy = cloneOverlayEntry(input);
    input.target.id = 'changed';
    input.interaction.accessibleLabel = 'Changed';
    input.interaction.contextMenu![0].enabled = true;
    input.interaction.contextMenu!.push({ id: 'extra', label: 'Extra', enabled: true });

    expect(copy).toEqual({
      id: 'marker',
      kind: 'marker',
      target: { kind: 'node', id: 'route|log' },
      icon: 'circle',
      emphasis: 'subdued',
      interaction: {
        accessibleLabel: 'Step marker',
        tooltip: '',
        contextMenu: [{ id: 'toggle', label: 'Toggle marker', enabled: false, icon: 'toggle' }],
      },
    });
  });

  it('detaches annotations and highlights and preserves zero and empty strings', () => {
    const input = annotation();
    const copy = cloneOverlayEntry(input);
    copy.target.id = 'changed';
    if (copy.kind === 'annotation') copy.interaction.accessibleLabel = 'Changed';
    expect(input.target).toEqual({ kind: 'route', id: 'route' });
    expect(input.interaction.accessibleLabel).toBe('Message count');
    expect(copy).toMatchObject({ text: '', value: 0, unit: '' });

    const highlight: OverlayEntry = {
      id: 'highlight',
      kind: 'highlight',
      target: { kind: 'edge', id: 'edge' },
      tone: 'info',
      emphasis: 'strong',
    };
    cloneOverlayEntry(highlight).target.id = 'changed';
    expect(highlight.target.id).toBe('edge');
  });

  it('copies only declared fields', () => {
    const input = { ...marker(), extra: 'ignored' };
    expect(cloneOverlayEntry(input)).not.toHaveProperty('extra');
  });
});
