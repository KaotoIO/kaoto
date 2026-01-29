/**
 * BaseKowNode - Generic implementation of IKowNode
 *
 * Provides lazy evaluation: children are built on-demand when getChildren() is called,
 * then cached for subsequent access. This is memory-efficient and fast for repeated access.
 */
import { IKowNode, IKowNodeVisitor, KowChildDescriptor } from './kow-node';
import { IKowNodeResolver } from './kow-node-resolver';

export class BaseKowNode<TData = unknown, TType extends string = string, TCatalog = unknown> implements IKowNode<
  TData,
  TType,
  TCatalog
> {
  readonly name: string;
  readonly path: string;
  readonly type: TType;
  readonly data: TData;
  readonly catalogEntry?: TCatalog;

  private _parent?: IKowNode<unknown, TType, TCatalog>;
  private _children?: IKowNode<unknown, TType, TCatalog>[];
  private _isArrayElement: boolean;
  private _arrayIndex?: number;
  private _siblings?: IKowNode<unknown, TType, TCatalog>[];
  private _siblingIndex?: number;

  private readonly resolver: IKowNodeResolver<TType, TCatalog>;

  constructor(options: {
    name: string;
    path: string;
    data: TData;
    resolver: IKowNodeResolver<TType, TCatalog>;
    parent?: IKowNode<unknown, TType, TCatalog>;
    isArrayElement?: boolean;
    arrayIndex?: number;
    siblings?: IKowNode<unknown, TType, TCatalog>[];
    siblingIndex?: number;
  }) {
    this.name = options.name;
    this.path = options.path;
    this.data = options.data;
    this.resolver = options.resolver;
    this._parent = options.parent;
    this._isArrayElement = options.isArrayElement ?? false;
    this._arrayIndex = options.arrayIndex;
    this._siblings = options.siblings;
    this._siblingIndex = options.siblingIndex;

    // Determine node type and catalog entry
    this.type = this.resolver.getNodeType(this.name, this.data);
    this.catalogEntry = this.resolver.getCatalogEntry(this.name, this.type);
  }

  getParent(): IKowNode<unknown, TType, TCatalog> | undefined {
    return this._parent;
  }

  getChildren(): IKowNode<unknown, TType, TCatalog>[] {
    // Lazy evaluation: build children on first access
    if (this._children === undefined) {
      this._children = this.buildChildren();
    }
    return this._children;
  }

  getNextSibling(): IKowNode<unknown, TType, TCatalog> | undefined {
    if (this._siblings && this._siblingIndex !== undefined) {
      return this._siblings[this._siblingIndex + 1];
    }
    return undefined;
  }

  getPreviousSibling(): IKowNode<unknown, TType, TCatalog> | undefined {
    if (this._siblings && this._siblingIndex !== undefined && this._siblingIndex > 0) {
      return this._siblings[this._siblingIndex - 1];
    }
    return undefined;
  }

  hasChildren(): boolean {
    return this.getChildren().length > 0;
  }

  isArrayElement(): boolean {
    return this._isArrayElement;
  }

  accept<TResult>(visitor: IKowNodeVisitor<TType, TResult>): TResult {
    return visitor.visit(this);
  }

  /**
   * Build child nodes from data using resolver
   */
  private buildChildren(): IKowNode<unknown, TType, TCatalog>[] {
    if (!this.data || typeof this.data !== 'object') {
      return [];
    }

    const childDescriptors = this.resolver.getChildNodes(this.name, this.data as Record<string, unknown>, this.type);

    const children: IKowNode<unknown, TType, TCatalog>[] = [];

    for (let i = 0; i < childDescriptors.length; i++) {
      const descriptor = childDescriptors[i];
      const childPath = this.buildChildPath(descriptor);

      const child = new BaseKowNode<unknown, TType, TCatalog>({
        name: descriptor.name,
        path: childPath,
        data: descriptor.data,
        resolver: this.resolver,
        parent: this,
        isArrayElement: descriptor.isArrayElement,
        arrayIndex: descriptor.index,
        siblings: children,
        siblingIndex: i,
      });

      children.push(child);
    }

    return children;
  }

  /**
   * Build path for a child node
   */
  private buildChildPath(descriptor: KowChildDescriptor): string {
    if (descriptor.isArrayElement && descriptor.index !== undefined) {
      return `${this.path}.${descriptor.name}[${descriptor.index}]`;
    }
    return `${this.path}.${descriptor.name}`;
  }
}

/**
 * Factory function to create a KOW tree
 */
export function createKowTree<TData, TType extends string, TCatalog>(
  name: string,
  data: TData,
  resolver: IKowNodeResolver<TType, TCatalog>,
): IKowNode<TData, TType, TCatalog> {
  return new BaseKowNode<TData, TType, TCatalog>({
    name,
    path: name,
    data,
    resolver,
  });
}
