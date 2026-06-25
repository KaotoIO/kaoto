// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { FunctionGroup } from '../xpath-model';
import { arrayFunctions } from './xpath-3.1-functions-array';
import { booleanFunctions } from './xpath-3.1-functions-boolean';
import { contextFunctions } from './xpath-3.1-functions-context';
import { dateAndTimeFunctions } from './xpath-3.1-functions-datetime';
import { higherOrderFunctions } from './xpath-3.1-functions-higherorder';
import { mapFunctions } from './xpath-3.1-functions-map';
import { mathFunctions } from './xpath-3.1-functions-math';
import { nodeFunctions } from './xpath-3.1-functions-node';
import { numericFunctions } from './xpath-3.1-functions-numeric';
import { patternMatchingFunctions } from './xpath-3.1-functions-patternmatching';
import { qnameFunctions } from './xpath-3.1-functions-qname';
import { sequenceFunctions } from './xpath-3.1-functions-sequence';
import { stringFunctions } from './xpath-3.1-functions-string';
import { substringMatchingFunctions } from './xpath-3.1-functions-substringmatching';
import { xsltFunctions } from './xpath-3.1-functions-xslt';

export const XPATH_3_1_FUNCTIONS: Record<FunctionGroup, IFunctionDefinition[]> = {
  String: stringFunctions,
  SubstringMatching: substringMatchingFunctions,
  PatternMatching: patternMatchingFunctions,
  Numeric: numericFunctions,
  DateAndTime: dateAndTimeFunctions,
  Boolean: booleanFunctions,
  QName: qnameFunctions,
  Node: nodeFunctions,
  Sequence: sequenceFunctions,
  Context: contextFunctions,
  Math: mathFunctions,
  MapFunctions: mapFunctions,
  ArrayFunctions: arrayFunctions,
  HigherOrder: higherOrderFunctions,
  XSLT: xsltFunctions,
};
