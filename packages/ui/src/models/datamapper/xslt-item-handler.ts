import { IParentType } from './document';
import { MappingItem, MappingParentType } from './mapping';

/**
 * Constructor type for any class that extends {@link MappingItem}.
 * Used as the key type in the serialize handler table.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MappingItemClass = abstract new (...args: any[]) => MappingItem;

/**
 * Result of deserializing an XSLT element into a mapping model node.
 * {@link fieldItem} is non-null only when the handler resolves a target field
 * (e.g. `xsl:attribute` or a target element).
 */
export interface DeserializeResult {
  mappingItem: MappingItem;
  fieldItem: IParentType | null;
}

/**
 * Handles bidirectional conversion between a {@link MappingItem} subclass
 * and its XSLT DOM representation.
 * Each handler declares its {@link itemClass} and {@link xsltElementNames},
 * from which the serialize and deserialize lookup tables are derived automatically.
 */
export interface XsltItemHandler<T extends MappingItem = MappingItem> {
  /** The {@link MappingItem} subclass this handler serializes. */
  readonly itemClass: MappingItemClass;
  /** XSLT element `localName`(s) this handler deserializes. Empty for fallback handlers. */
  readonly xsltElementNames: string[];
  /** Create XSLT DOM element(s) for the given mapping item and append to `parent`. */
  serialize(parent: Element, mapping: T): Element | null;
  /** Create a {@link MappingItem} from the given XSLT DOM element, or null to skip. */
  deserialize(element: Element, parentField: IParentType, parentMapping: MappingParentType): DeserializeResult | null;
}
