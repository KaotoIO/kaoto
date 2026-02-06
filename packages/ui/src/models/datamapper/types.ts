/**
 * The data types mapped from XML Schema +.
 */
export enum Types {
  AnyAtomicType = 'anyAtomicType',
  AnyType = 'anyType',
  AnyURI = 'anyURI',
  String = 'string',
  Float = 'float',
  Double = 'double',
  Integer = 'integer',
  Decimal = 'decimal',
  PositiveInteger = 'positiveInteger',
  Boolean = 'boolean',
  Date = 'date',
  DateTime = 'dateTime',
  Time = 'time',
  QName = 'QName',
  Duration = 'duration',
  DayTimeDuration = 'dayTimeDuration',
  NCName = 'NCName',
  // not XSD predefined but appear in XPath function signature
  Numeric = 'numeric',
  Item = 'item()',
  Element = 'element()',
  Node = 'node()',
  DocumentNode = 'document-node()',
  // custom types
  Container = 'Container',
  Array = 'Array',
}

export enum TypeOverrideVariant {
  NONE = 'NONE',
  SAFE = 'SAFE',
  FORCE = 'FORCE',
}

/**
 * Type derivation enum to indicate whether it's extension or restriction in XML Schema type inheritance.
 */
export enum TypeDerivation {
  EXTENSION = 'extension',
  RESTRICTION = 'restriction',
}

/**
 * Represents metadata about a field type that can be used for type selection, documentation, and validation.
 * Includes type inheritance information for XML Schema types.
 */
export interface IFieldTypeInfo {
  /** Human-readable display name (simple local name for user types like "Person", prefixed for built-ins like "xs:string") */
  displayName: string;
  /** Full qualified type name to pass to parseTypeOverride (e.g., "xs:string", "tns:CustomType") */
  typeString: string;
  /** Mapped DataMapper type enum value */
  type: Types;
  /** Namespace URI of the type (null for types without namespace) */
  namespaceURI: string | null;
  /** Optional description extracted from xs:annotation/xs:documentation for tooltip/help text */
  description?: string;
  /** True for XML Schema built-in types (xs:string, xs:int, etc.), false for user-defined types */
  isBuiltIn: boolean;
  /** TypeString reference to base type for extensions/restrictions */
  base?: string;
  /** How this type derives from its base type (extension or restriction) */
  derivation?: TypeDerivation;
}
