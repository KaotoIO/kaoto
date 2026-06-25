// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const contextFunctions: IFunctionDefinition[] = [
  {
    name: 'error',
    displayName: 'Error',
    description: 'Calling the fn:error function raises an application-defined error.',
    returnType: Types.EmptySequence,
    arguments: [
      { name: 'code', displayName: '$code', description: 'Code', type: Types.QName, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'description',
        displayName: '$description',
        description: 'Description',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      {
        name: 'error-object',
        displayName: '$error-object',
        description: 'Error Object',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'trace',
    displayName: 'Trace',
    description: 'Provides an execution trace intended to be used in debugging queries.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      {
        name: 'value',
        displayName: '$value',
        description: 'Value',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      { name: 'label', displayName: '$label', description: 'Label', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'position',
    displayName: 'Position',
    description: 'Returns the context position from the dynamic context.',
    returnType: Types.Integer,
    arguments: [],
  },
  {
    name: 'last',
    displayName: 'Last',
    description: 'Returns the context size from the dynamic context.',
    returnType: Types.Integer,
    arguments: [],
  },
  {
    name: 'current-dateTime',
    displayName: 'Current DateTime',
    description: 'Returns the current date and time (with timezone).',
    returnType: Types.DateTime,
    arguments: [],
  },
  {
    name: 'current-date',
    displayName: 'Current Date',
    description: 'Returns the current date.',
    returnType: Types.Date,
    arguments: [],
  },
  {
    name: 'current-time',
    displayName: 'Current Time',
    description: 'Returns the current time.',
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
    name: 'default-language',
    displayName: 'Default Language',
    description: 'Returns the value of the default language property from the dynamic context.',
    returnType: Types.String,
    arguments: [],
  },
  {
    name: 'static-base-uri',
    displayName: 'Static Base Uri',
    description: 'This function returns the value of the static base URI property from the static context.',
    returnType: Types.AnyURI,
    arguments: [],
  },
];
