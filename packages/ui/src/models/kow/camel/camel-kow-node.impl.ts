/**
 * CamelKowNode - Camel-specific KOW node implementation
 *
 * Extends BaseKowNode with Camel-specific type guards and utilities.
 */
import { CamelUriHelper } from '../../../utils/camel-uri-helper';
import { BaseKowNode, IKowNodeVisitor } from '../base';
import { CamelCatalogEntry, ICamelKowNode } from './camel-kow-node';
import { CamelKowNodeType } from './camel-kow-node-type';
import { CamelNodeResolver } from './camel-node-resolver';

export class CamelKowNode<TData = Record<string, unknown>>
  extends BaseKowNode<TData, CamelKowNodeType, CamelCatalogEntry>
  implements ICamelKowNode<TData>
{
  isEntity(): this is ICamelKowNode & { type: CamelKowNodeType.Entity } {
    return this.type === CamelKowNodeType.Entity;
  }

  isEip(): this is ICamelKowNode & { type: CamelKowNodeType.Eip } {
    return this.type === CamelKowNodeType.Eip;
  }

  isComponent(): this is ICamelKowNode & { type: CamelKowNodeType.Component } {
    return this.type === CamelKowNodeType.Component;
  }

  isLanguage(): this is ICamelKowNode & { type: CamelKowNodeType.Language } {
    return this.type === CamelKowNodeType.Language;
  }

  isDataformat(): this is ICamelKowNode & { type: CamelKowNodeType.Dataformat } {
    return this.type === CamelKowNodeType.Dataformat;
  }

  isLoadbalancer(): this is ICamelKowNode & { type: CamelKowNodeType.Loadbalancer } {
    return this.type === CamelKowNodeType.Loadbalancer;
  }

  getUri(): string | undefined {
    if (!this.data || typeof this.data !== 'object') return undefined;
    const data = this.data as Record<string, unknown>;
    return typeof data.uri === 'string' ? data.uri : undefined;
  }

  getComponentName(): string | undefined {
    const uri = this.getUri();
    if (!uri) return undefined;
    return CamelUriHelper.getComponentNameFromUri(uri);
  }

  override accept<TResult>(visitor: IKowNodeVisitor<CamelKowNodeType, TResult>): TResult {
    return visitor.visit(this);
  }
}

/**
 * Factory function to create a Camel KOW tree
 */
export function createCamelKowTree<TData extends Record<string, unknown>>(
  entityName: string,
  data: TData,
): ICamelKowNode<TData> {
  const resolver = new CamelNodeResolver();

  return new CamelKowNode<TData>({
    name: entityName,
    path: entityName,
    data,
    resolver,
  });
}

/**
 * Type-safe factory for route trees
 */
export function createRouteTree(data: Record<string, unknown>): ICamelKowNode<Record<string, unknown>> {
  return createCamelKowTree('route', data);
}

/**
 * Type-safe factory for from trees
 */
export function createFromTree(data: Record<string, unknown>): ICamelKowNode<Record<string, unknown>> {
  return createCamelKowTree('from', data);
}
