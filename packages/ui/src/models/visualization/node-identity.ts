// packages/ui/src/models/visualization/node-identity.ts
import { CatalogKind } from '../catalog-kind';

/**
 * A single identity descriptor for a visualization node.
 * DSL-agnostic: Camel Routes, Kamelet, Pipe, and Citrus each populate
 * this with their own catalog kinds and names.
 *
 * See docs/GLOSSARY.md — "Node Identity" for the canonical definition.
 */
export interface NodeIdentity {
  /** The catalog entry name, e.g. 'to', 'timer', 'weather-source', 'echo' */
  name: string;
  /** The catalog kind, e.g. CatalogKind.Processor, CatalogKind.Component, CatalogKind.Kamelet */
  catalogKind: CatalogKind;
}
