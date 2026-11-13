import { getNodeIndicatorBounds, getPlaceholderIndicatorBounds, INDICATOR_CLEARANCE } from './interaction-indicator';

describe('interaction-indicator', () => {
  const box = { width: 90, height: 75 };

  it('encloses the icon tile and its badge overhang plus clearance', () => {
    const bounds = getNodeIndicatorBounds(box);

    expect(bounds.x).toBe((90 - 60) / 2 - 14);
    expect(bounds.width).toBe(60 + 28);
  });

  it('keeps the top edge inside the node box, where incoming edges end', () => {
    expect(getNodeIndicatorBounds(box).y).toBe(2);
    // With enough room above the tile, the top encloses the badge overhang plus clearance
    expect(getNodeIndicatorBounds({ width: 90, height: 100 }).y).toBe((100 - 60) / 2 - 14);
  });

  it('keeps the bottom edge at least 2px above the label', () => {
    const bounds = getNodeIndicatorBounds(box);

    expect(bounds.y + bounds.height).toBeLessThanOrEqual(75 - 1 - 2);
    expect(bounds.y + bounds.height).toBeGreaterThan((75 + 60) / 2);
  });

  it('uses the full bottom clearance when the label is far enough away', () => {
    const bounds = getNodeIndicatorBounds({ width: 90, height: 100 });

    expect(bounds.y + bounds.height).toBe((100 + 60) / 2 + 6);
  });

  it('keeps the indicator of a placeholder clear of the incoming edge and of the label', () => {
    // A placeholder box: the incoming edge ends at its top, the label starts at `height - 1`
    const placeholderBox = { width: 60, height: 55 };
    const tile = { top: (55 - 36) / 2, bottom: (55 + 36) / 2 };
    // The selected and focused strokes are 2px wide, centred on the bounds
    const strokeOutset = 1;

    const bounds = getPlaceholderIndicatorBounds(placeholderBox);

    expect(bounds.y).toBe(tile.top - INDICATOR_CLEARANCE);
    expect(bounds.y + bounds.height).toBe(tile.bottom + INDICATOR_CLEARANCE);
    expect(bounds.y - strokeOutset).toBeGreaterThanOrEqual(1);
    expect(bounds.y + bounds.height + strokeOutset).toBeLessThanOrEqual(placeholderBox.height - 1);
  });
});
