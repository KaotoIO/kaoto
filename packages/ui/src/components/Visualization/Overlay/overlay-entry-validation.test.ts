import { OverlayEntry } from './overlay-entries';
import { cloneOverlayEntry, validateOverlayEntries } from './overlay-entry-validation';

const annotation = (): Extract<OverlayEntry, { kind: 'annotation' }> => ({
  id: 'annotation',
  kind: 'annotation',
  target: { kind: 'route', id: 'route' },
  text: '',
  value: 0,
  unit: '',
  interaction: { accessibleLabel: 'Message count', tooltip: 'Route count' },
});

describe('validateOverlayEntries', () => {
  it('accepts explicit highlights and annotations for all target kinds', () => {
    expect(
      validateOverlayEntries([
        { id: 'node', kind: 'highlight', target: { kind: 'node', id: 'route|log' }, tone: 'warning' },
        { id: 'edge', kind: 'highlight', target: { kind: 'edge', id: 'route|a >>> b' } },
        annotation(),
        { ...annotation(), id: 'edge-count', target: { kind: 'edge', id: 'route|a >>> b' }, value: -1 },
        { ...annotation(), id: 'node-count', target: { kind: 'node', id: 'route|log' } },
      ]),
    ).toBeUndefined();
    expect(validateOverlayEntries([])).toBeUndefined();
  });

  it.each([
    ['empty entry ID', () => [{ ...annotation(), id: '' }]],
    [
      'duplicate ID across kinds',
      () => [annotation(), { id: 'annotation', kind: 'highlight', target: { kind: 'node', id: 'node' } }],
    ],
    ['blank accessible label', () => [{ ...annotation(), interaction: { accessibleLabel: ' \t' } }]],
    ['NaN value', () => [{ ...annotation(), value: Number.NaN }]],
    ['infinite value', () => [{ ...annotation(), value: Number.POSITIVE_INFINITY }]],
    ['negative infinite value', () => [{ ...annotation(), value: Number.NEGATIVE_INFINITY }]],
  ] satisfies [string, () => OverlayEntry[]][])('rejects %s', (_name, entries) => {
    expect(validateOverlayEntries(entries())).toEqual(expect.any(String));
  });

  it('rejects a highlight on a route target', () => {
    const entry = { id: 'invalid', kind: 'highlight', target: { kind: 'route', id: 'route' } } as OverlayEntry;
    expect(validateOverlayEntries([entry])).toEqual(expect.any(String));
  });
});

describe('cloneOverlayEntry', () => {
  it('detaches annotation targets and tooltip metadata and preserves zero and empty strings', () => {
    const input = annotation();
    const copy = cloneOverlayEntry(input);
    input.target.id = 'changed';
    input.interaction.accessibleLabel = 'Changed';
    input.interaction.tooltip = 'Changed tooltip';
    expect(copy).toEqual(annotation());
    expect(copy).toMatchObject({ text: '', value: 0, unit: '' });
  });

  it('detaches highlight targets', () => {
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
    const input = { ...annotation(), extra: 'ignored' };
    expect(cloneOverlayEntry(input)).not.toHaveProperty('extra');
  });
});
