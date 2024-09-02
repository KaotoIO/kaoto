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
}
