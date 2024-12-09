import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

/**
 * 16 Context - https://www.w3.org/TR/2010/REC-xpath-functions-20101214/#context
 */
export const contextFunctions = [
  {
    name: 'position',
    displayName: 'Position',
    description: 'Returns the position of the context item within the sequence of items currently being processed.',
    returnType: Types.Integer,
    arguments: [],
  },
  {
    name: 'last',
    displayName: 'Last',
    description: 'Returns the number of items in the sequence of items currently being processed.',
    returnType: Types.Integer,
    arguments: [],
  },
  {
    name: 'current-dateTime',
    displayName: 'Current DateTime',
    description: 'Returns the current xs:dateTime.',
    returnType: Types.DateTime,
    arguments: [],
  },
  {
    name: 'current-date',
    displayName: 'Current Date',
    description: 'Returns the current xs:date.',
    returnType: Types.Date,
    arguments: [],
  },
  {
    name: 'current-time',
    displayName: 'Current Time',
    description: 'Returns the current xs:time.',
    returnType: Types.Time,
    arguments: [],
  },
  {
    name: 'implicit-timezone',
    displayName: 'Implicit Timezone',
    description: 'Returns the value of the implicit timezone property from the dynamic context.',
    returnType: Types.DayTimeDuration,
    arguments: [],
  },
  {
    name: 'default-collation',
    displayName: 'Default Collation',
    description: 'Returns the value of the default collation property from the static context.',
    returnType: Types.String,
    arguments: [],
  },
  {
    name: 'static-base-uri',
    displayName: 'Static Base URI',
    description: 'Returns the value of the Base URI property from the static context.',
    returnType: Types.AnyURI,
    arguments: [],
  },
] as IFunctionDefinition[];
