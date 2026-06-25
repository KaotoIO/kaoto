// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const dateAndTimeFunctions: IFunctionDefinition[] = [
  {
    name: 'years-from-duration',
    displayName: 'Years From Duration',
    description: 'Returns the number of years in a duration.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Duration, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'months-from-duration',
    displayName: 'Months From Duration',
    description: 'Returns the number of months in a duration.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Duration, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'days-from-duration',
    displayName: 'Days From Duration',
    description: 'Returns the number of days in a duration.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Duration, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'hours-from-duration',
    displayName: 'Hours From Duration',
    description: 'Returns the number of hours in a duration.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Duration, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'minutes-from-duration',
    displayName: 'Minutes From Duration',
    description: 'Returns the number of minutes in a duration.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Duration, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'seconds-from-duration',
    displayName: 'Seconds From Duration',
    description: 'Returns the number of seconds in a duration.',
    returnType: Types.Decimal,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Duration, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'dateTime',
    displayName: 'DateTime',
    description: 'Returns an xs:dateTime value created by combining an xs:date and an xs:time.',
    returnType: Types.DateTime,
    arguments: [
      { name: 'arg1', displayName: '$arg1', description: 'Arg1', type: Types.Date, minOccurs: 0, maxOccurs: 1 },
      { name: 'arg2', displayName: '$arg2', description: 'Arg2', type: Types.Time, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'year-from-dateTime',
    displayName: 'Year From DateTime',
    description: 'Returns the year component of an xs:dateTime.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.DateTime, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'month-from-dateTime',
    displayName: 'Month From DateTime',
    description: 'Returns the month component of an xs:dateTime.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.DateTime, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'day-from-dateTime',
    displayName: 'Day From DateTime',
    description: 'Returns the day component of an xs:dateTime.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.DateTime, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'hours-from-dateTime',
    displayName: 'Hours From DateTime',
    description: 'Returns the hours component of an xs:dateTime.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.DateTime, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'minutes-from-dateTime',
    displayName: 'Minutes From DateTime',
    description: 'Returns the minute component of an xs:dateTime.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.DateTime, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'seconds-from-dateTime',
    displayName: 'Seconds From DateTime',
    description: 'Returns the seconds component of an xs:dateTime.',
    returnType: Types.Decimal,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.DateTime, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'timezone-from-dateTime',
    displayName: 'Timezone From DateTime',
    description: 'Returns the timezone component of an xs:dateTime.',
    returnType: Types.DayTimeDuration,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.DateTime, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'year-from-date',
    displayName: 'Year From Date',
    description: 'Returns the year component of an xs:date.',
    returnType: Types.Integer,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Date, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'month-from-date',
    displayName: 'Month From Date',
    description: 'Returns the month component of an xs:date.',
    returnType: Types.Integer,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Date, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'day-from-date',
    displayName: 'Day From Date',
    description: 'Returns the day component of an xs:date.',
    returnType: Types.Integer,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Date, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'timezone-from-date',
    displayName: 'Timezone From Date',
    description: 'Returns the timezone component of an xs:date.',
    returnType: Types.DayTimeDuration,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Date, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'hours-from-time',
    displayName: 'Hours From Time',
    description: 'Returns the hours component of an xs:time.',
    returnType: Types.Integer,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Time, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'minutes-from-time',
    displayName: 'Minutes From Time',
    description: 'Returns the minutes component of an xs:time.',
    returnType: Types.Integer,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Time, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'seconds-from-time',
    displayName: 'Seconds From Time',
    description: 'Returns the seconds component of an xs:time.',
    returnType: Types.Decimal,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Time, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'timezone-from-time',
    displayName: 'Timezone From Time',
    description: 'Returns the timezone component of an xs:time.',
    returnType: Types.DayTimeDuration,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Time, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'adjust-dateTime-to-timezone',
    displayName: 'Adjust DateTime To Timezone',
    description: 'Adjusts an xs:dateTime value to a specific timezone, or to no timezone at all.',
    returnType: Types.DateTime,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.DateTime, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'timezone',
        displayName: '$timezone',
        description: 'Timezone',
        type: Types.DayTimeDuration,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'adjust-date-to-timezone',
    displayName: 'Adjust Date To Timezone',
    description:
      'Adjusts an xs:date value to a specific timezone, or to no timezone at all; the result is the date in the target timezone that contains the starting instant of the supplied date.',
    returnType: Types.Date,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Date, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'timezone',
        displayName: '$timezone',
        description: 'Timezone',
        type: Types.DayTimeDuration,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'adjust-time-to-timezone',
    displayName: 'Adjust Time To Timezone',
    description: 'Adjusts an xs:time value to a specific timezone, or to no timezone at all.',
    returnType: Types.Time,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Time, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'timezone',
        displayName: '$timezone',
        description: 'Timezone',
        type: Types.DayTimeDuration,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'format-dateTime',
    displayName: 'Format DateTime',
    description: 'Returns a string containing an xs:dateTime value formatted for display.',
    returnType: Types.String,
    arguments: [
      { name: 'value', displayName: '$value', description: 'Value', type: Types.DateTime, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'picture',
        displayName: '$picture',
        description: 'Picture',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'language',
        displayName: '$language',
        description: 'Language',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      {
        name: 'calendar',
        displayName: '$calendar',
        description: 'Calendar',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      { name: 'place', displayName: '$place', description: 'Place', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'format-date',
    displayName: 'Format Date',
    description: 'Returns a string containing an xs:date value formatted for display.',
    returnType: Types.String,
    arguments: [
      { name: 'value', displayName: '$value', description: 'Value', type: Types.Date, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'picture',
        displayName: '$picture',
        description: 'Picture',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'language',
        displayName: '$language',
        description: 'Language',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      {
        name: 'calendar',
        displayName: '$calendar',
        description: 'Calendar',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      { name: 'place', displayName: '$place', description: 'Place', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'format-time',
    displayName: 'Format Time',
    description: 'Returns a string containing an xs:time value formatted for display.',
    returnType: Types.String,
    arguments: [
      { name: 'value', displayName: '$value', description: 'Value', type: Types.Time, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'picture',
        displayName: '$picture',
        description: 'Picture',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'language',
        displayName: '$language',
        description: 'Language',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      {
        name: 'calendar',
        displayName: '$calendar',
        description: 'Calendar',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      { name: 'place', displayName: '$place', description: 'Place', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'parse-ietf-date',
    displayName: 'Parse Ietf Date',
    description:
      'Parses a string containing the date and time in IETF format, returning the corresponding xs:dateTime value.',
    returnType: Types.DateTime,
    arguments: [
      { name: 'value', displayName: '$value', description: 'Value', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
];
