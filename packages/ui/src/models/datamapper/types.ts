import { QName } from '../../xml-schema-ts/QName';

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

export enum FieldOverrideVariant {
  NONE = 'NONE',
  SAFE = 'SAFE',
  FORCE = 'FORCE',
  SUBSTITUTION = 'SUBSTITUTION',
}

export interface LangOption {
  id: string;
  displayName: string;
}

export const LANG_OPTIONS: ReadonlyArray<LangOption> = [
  { id: 'en', displayName: 'English' },
  { id: 'en-US', displayName: 'U.S. English' },
  { id: 'en-GB', displayName: 'British English' },
  { id: 'de', displayName: 'German' },
  { id: 'fr', displayName: 'French' },
  { id: 'es', displayName: 'Spanish' },
  { id: 'it', displayName: 'Italian' },
  { id: 'pt', displayName: 'Portuguese' },
  { id: 'nl', displayName: 'Dutch' },
  { id: 'ja', displayName: 'Japanese' },
  { id: 'zh', displayName: 'Chinese' },
  { id: 'ko', displayName: 'Korean' },
  { id: 'ru', displayName: 'Russian' },
  { id: 'ar', displayName: 'Arabic' },
  { id: 'sv', displayName: 'Swedish' },
  { id: 'da', displayName: 'Danish' },
  { id: 'fi', displayName: 'Finnish' },
  { id: 'nb', displayName: 'Norwegian' },
  { id: 'pl', displayName: 'Polish' },
  { id: 'cs', displayName: 'Czech' },
  { id: 'tr', displayName: 'Turkish' },
];

/**
 * Type derivation enum to indicate whether it's extension or restriction in XML Schema type inheritance.
 */
export enum TypeDerivation {
  EXTENSION = 'extension',
  RESTRICTION = 'restriction',
}

/**
 * Represents the resolved state of a substitute element used when applying a field substitution.
 * Contains the wire name, namespace, and type information of the substitute element.
 */
export interface IFieldSubstituteInfo {
  qname: QName;
  displayName: string;
  type: Types;
  typeQName: QName | null;
  namedTypeFragmentRefs: string[];
}

/**
 * Represents metadata about a field type that can be used for type selection, documentation, and validation.
 * Includes type inheritance information for XML Schema types.
 */
export interface IFieldTypeInfo {
  /** Human-readable display name (simple local name for user types like "Person", prefixed for built-ins like "xs:string") */
  displayName: string;
  /** Qualified name of the type, encapsulating namespace URI and local part */
  typeQName: QName;
  /** Mapped DataMapper type enum value */
  type: Types;
  /** Optional description extracted from xs:annotation/xs:documentation for tooltip/help text */
  description?: string;
  /** True for XML Schema built-in types (xs:string, xs:int, etc.), false for user-defined types */
  isBuiltIn: boolean;
  /** QName of the base type for extensions/restrictions */
  baseQName?: QName;
  /** How this type derives from its base type (extension or restriction) */
  derivation?: TypeDerivation;
}
