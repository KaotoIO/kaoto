/**
 * IKowNode - Generic Model Node interface for tree traversal
 *
 * KOW (Kaoto Object Walker) is a generic tree infrastructure for traversing
 * and operating on structured data (Camel routes, Citrus tests, etc.).
 *
 * @typeParam TData - The data type this node holds
 * @typeParam TType - The node type enum (CamelKowNodeType, CitrusKowNodeType, etc.)
 * @typeParam TCatalog - The catalog entry type (optional)
 */
export interface IKowNode<TData = unknown, TType extends string = string, TCatalog = unknown> {
  // Identity
  readonly name: string;
  readonly path: string;
  readonly type: TType;

  // Data access
  readonly data: TData;
  readonly catalogEntry?: TCatalog;

  // Navigation
  getParent(): IKowNode<unknown, TType, TCatalog> | undefined;
  getChildren(): IKowNode<unknown, TType, TCatalog>[];
  getNextSibling(): IKowNode<unknown, TType, TCatalog> | undefined;
  getPreviousSibling(): IKowNode<unknown, TType, TCatalog> | undefined;

  // Utility
  hasChildren(): boolean;
  isArrayElement(): boolean;

  // Visitor pattern support
  accept<TResult>(visitor: IKowNodeVisitor<TType, TResult>): TResult;
}

/**
 * Visitor interface for performing operations on the tree
 * Each operation (sorting, validation, search) is a separate visitor
 */
export interface IKowNodeVisitor<TType extends string, TResult> {
  visit(node: IKowNode<unknown, TType, unknown>): TResult;
}

/**
 * Child node descriptor returned by resolver
 */
export interface KowChildDescriptor {
  name: string;
  data: unknown;
  isArrayElement: boolean;
  index?: number;
}
