/**
 * ICamelKowNode - Camel-specific KOW node interface
 *
 * Extends the generic IKowNode with Camel-specific type guards and utilities.
 */
import { ICamelComponentDefinition } from '../../../camel-catalog-index';
import { ICamelProcessorDefinition } from '../../../camel-processors-catalog';
import { IKowNode } from '../base';
import { CamelKowNodeType } from './camel-kow-node-type';

/**
 * Catalog entry types for Camel nodes
 */
export type CamelCatalogEntry = ICamelProcessorDefinition | ICamelComponentDefinition;

/**
 * Camel-specific node interface
 */
export interface ICamelKowNode<TData = Record<string, unknown>> extends IKowNode<
  TData,
  CamelKowNodeType,
  CamelCatalogEntry
> {
  // Camel-specific type guards
  isEntity(): this is ICamelKowNode & { type: CamelKowNodeType.Entity };
  isEip(): this is ICamelKowNode & { type: CamelKowNodeType.Eip };
  isComponent(): this is ICamelKowNode & { type: CamelKowNodeType.Component };
  isLanguage(): this is ICamelKowNode & { type: CamelKowNodeType.Language };
  isDataformat(): this is ICamelKowNode & { type: CamelKowNodeType.Dataformat };
  isLoadbalancer(): this is ICamelKowNode & { type: CamelKowNodeType.Loadbalancer };

  // Camel-specific utilities
  getUri(): string | undefined;
  getComponentName(): string | undefined;
}
