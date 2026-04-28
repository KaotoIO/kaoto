import { IParentType } from './document';
import { MappingItem, MappingParentType, MappingTree } from './mapping';
import { SendAlertProps } from './visualization';

/**
 * Constructor type for any class that extends {@link MappingItem}.
 * Used as the key type in the serialize handler lookup table.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MappingItemClass = abstract new (...args: any[]) => MappingItem;

/**
 * Per-handler result for a single XSLT element.
 * {@link mappingItem} is absent when the element is skipped (e.g. reserved variable names)
 * but the handler still needs to report {@link messages}.
 * {@link fieldItem} is non-null only when the handler resolves a target field
 * (e.g. `xsl:attribute` or a target element).
 */
export interface DeserializeItemResult<T extends MappingItem> {
  mappingItem?: T;
  fieldItem: IParentType | null;
  messages?: SendAlertProps[];
}

/**
 * Top-level result returned by {@link MappingSerializerService.deserialize}.
 * Collects all {@link SendAlertProps} emitted during the full deserialization pass.
 */
export interface DeserializeResult {
  mappingTree: MappingTree;
  messages: SendAlertProps[];
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
  deserialize(
    element: Element,
    parentField: IParentType,
    parentMapping: MappingParentType,
  ): DeserializeItemResult<T> | null;
}
