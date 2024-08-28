import { IFunctionDefinition } from '../../../models/mapping';
import { FunctionGroup } from '../xpath-parser';
import { numericFunctions } from './xpath-2.0-functions-numeric';
import { patternMatchingFunctions, stringFunctions, substringMatchingFunctions } from './xpath-2.0-functions-string';
import { dateAndTimeFunctions } from './xpath-2.0-functions-datetime';
import { booleanFunctions } from './xpath-2.0-functions-boolean';
import { qnameFunctions } from './xpath-2.0-functions-qname';
import { nodeFunctions } from './xpath-2.0-functions-node';
import { sequenceFunctions } from './xpath-2.0-functions-sequence';
import { contextFunctions } from './xpath-2.0-functions-context';

/**
 * The XPath 2.0 functions catalog.
 * https://www.w3.org/TR/2010/REC-xpath-functions-20101214/
 */

export const XPATH_2_0_FUNCTIONS: Record<FunctionGroup, IFunctionDefinition[]> = {
  [FunctionGroup.String]: stringFunctions,
  [FunctionGroup.SubstringMatching]: substringMatchingFunctions,
  [FunctionGroup.PatternMatching]: patternMatchingFunctions,
  [FunctionGroup.Numeric]: numericFunctions,
  [FunctionGroup.DateAndTime]: dateAndTimeFunctions,
  [FunctionGroup.Boolean]: booleanFunctions,
  [FunctionGroup.QName]: qnameFunctions,
  [FunctionGroup.Node]: nodeFunctions,
  [FunctionGroup.Sequence]: sequenceFunctions,
  [FunctionGroup.Context]: contextFunctions,
};
