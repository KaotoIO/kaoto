import { Code, Flow } from '@carbon/icons-react';
import { describe, expect, it } from 'vitest';

import { ViewMode } from '../../../context/IntegrationHeaderContext';
import { EditorKind } from './editor-registry';
import { viewIconFor } from './view-icon';

describe('viewIconFor', () => {
  it.each<[EditorKind, ViewMode, string, unknown]>([
    ['route', 'design', 'Flow', Flow],
    ['route', 'code', 'Code', Code],
    ['text', 'design', 'Code', Code],
    ['text', 'code', 'Code', Code],
  ])('shows a %s file in the %s view with the %s icon', (kind, view, _name, icon) => {
    expect(viewIconFor(kind, view)).toBe(icon);
  });
});
