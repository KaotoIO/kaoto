// Ambient declarations (asset modules, build-time globals, vite/client) this entry point needs when
// another package consumes it as TypeScript source through the `@kaoto/source` export condition.
/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./global.d.ts" />
/// <reference path="./vite-env.d.ts" />
/* eslint-enable @typescript-eslint/triple-slash-reference */

/** Internal components exported for testing only */
export * from './components/DataMapper/debug';
export * from './components/Document/FieldIcon';
export * from './components/Document/Nodes/BaseNode';
export * from './components/ExpansionPanels';
export * from './components/ResizableSplitPanels';
export * from './components/Visualization/Canvas/controller.service';
export * from './components/Visualization/Canvas/Form/CanvasFormBody';
export * from './components/Visualization/Canvas/Form/fields/BeanField/NewBeanModal';
export * from './components/Visualization/Canvas/Form/fields/ExpressionField/ExpressionField';
export { OverlayPresentationDemo } from './components/Visualization/Overlay/demo/OverlayPresentationDemo';
export { buildDesignerOverlayTargetSnapshot } from './components/Visualization/Overlay/designer-overlay-targets';
export type { OverlayEntry } from './components/Visualization/Overlay/overlay-entries';
export type { CanvasOverlaySource } from './components/Visualization/Overlay/use-canvas-overlays';
export * from './dynamic-catalog';
export * from './dynamic-catalog/ui';
export * from './hooks/use-visible-viz-nodes';
export * from './layout';
export * from './models';
export * from './models/camel';
export * from './models/datamapper';
export * from './models/visualization/flows/nodes/resolvers/icon-resolver/getIconRequest';
export * from './providers';
export type { EntitiesContextResult } from './providers/entities.provider';
export { createOverlayStore } from './store/overlay.store';
export * from './stubs/camel-route';
export * from './stubs/kamelet-route';
export * from './stubs/pipe';
export * from './utils';

/** Re-export public components */
export * from './public-api';
