import { CarbonIconType, Code, Flow, Network_3 } from '@carbon/icons-react';

import { ViewMode } from '../../../context/IntegrationHeaderContext';
import { EditorKind } from './editor-registry';

const ROUTE_VIEW_ICONS: Record<ViewMode, CarbonIconType> = {
  design: Flow,
  code: Code,
  topology: Network_3,
};

/** The icon of the header bar: what the open file shows in the view; a text file only ever shows as code */
export const viewIconFor = (kind: EditorKind, view: ViewMode): CarbonIconType =>
  kind === 'route' ? ROUTE_VIEW_ICONS[view] : Code;
