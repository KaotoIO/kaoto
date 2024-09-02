import { Types } from '../../../models/types';
import { IFunctionDefinition } from '../../../models/mapping';

/**
 * 9.3 Boolean - https://www.w3.org/TR/2010/REC-xpath-functions-20101214/#boolean-value-functions
 */
export const booleanFunctions = [
  {
    name: 'not',
    displayName: 'Not',
    description: 'Inverts the xs:boolean value of the argument.',
    returnType: Types.Boolean,
    arguments: [
      {
        name: 'arg',
        displayName: '$arg',
        description: '$arg',
        type: Types.Item,
        minOccurs: 1,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
] as IFunctionDefinition[];
