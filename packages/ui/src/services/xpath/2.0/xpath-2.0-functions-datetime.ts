import { Types } from '../../../models/datamapper/types';
import { IFunctionDefinition } from '../../../models/datamapper/mapping';

/**
 * 10. Date and Time - https://www.w3.org/TR/2010/REC-xpath-functions-20101214/#durations-dates-times
 */
export const dateAndTimeFunctions = [
  {
    name: 'years-from-duration',
    displayName: 'Years From Duration',
    description: 'Returns the year component of an xs:duration value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Duration, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'months-from-duration',
    displayName: 'Months From Duration',
    description: 'Returns the months component of an xs:duration value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Duration, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'days-from-duration',
    displayName: 'Days From Duration',
    description: 'Returns the days component of an xs:duration value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Duration, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'hours-from-duration',
    displayName: 'Hours From Duration',
    description: 'Returns the hours component of an xs:duration value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Duration, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'minutes-from-duration',
    displayName: 'Minutes From Duration',
    description: 'Returns the minutes component of an xs:duration value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Duration, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'seconds-from-duration',
    displayName: 'Seconds From Duration',
    description: 'Returns the seconds component of an xs:duration value.',
    returnType: Types.Decimal,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Duration, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'year-from-dateTime',
    displayName: 'Year From Date Time',
    description: 'Returns the year from an xs:dateTime value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.DateTime, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'month-from-dateTime',
    displayName: 'Month From Date Time',
    description: 'Returns the month from an xs:dateTime value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.DateTime, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'day-from-dateTime',
    displayName: 'Day From Date Time',
    description: 'Returns the day from an xs:dateTime value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.DateTime, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'hours-from-dateTime',
    displayName: 'Hours From Date Time',
    description: 'Returns the hours from an xs:dateTime value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.DateTime, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'minutes-from-dateTime',
    displayName: 'Minutes From Date Time',
    description: 'Returns the minutes from an xs:dateTime value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.DateTime, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'seconds-from-dateTime',
    displayName: 'Seconds From Date Time',
    description: 'Returns the seconds from an xs:dateTime value.',
    returnType: Types.Decimal,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Decimal, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'timezone-from-dateTime',
    displayName: 'Timezone From Date Time',
    description: 'Returns the timezone from an xs:dateTime value.',
    returnType: Types.DayTimeDuration,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.DateTime, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'year-from-date',
    displayName: 'Year From Date',
    description: 'Returns the year from an xs:date value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Date, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'month-from-date',
    displayName: 'Month From Date',
    description: 'Returns the month from an xs:date value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Date, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'day-from-date',
    displayName: 'Day From Date',
    description: 'Returns the day from an xs:date value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Date, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'timezone-from-date',
    displayName: 'Timezone From Date',
    description: 'Returns the timezone from an xs:date value.',
    returnType: Types.DayTimeDuration,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Date, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'hours-from-time',
    displayName: 'Hours From Time',
    description: 'Returns the hours from an xs:time value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Time, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'minutes-from-time',
    displayName: 'Minutes From Time',
    description: 'Returns the minutes from an xs:time value.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Time, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'seconds-from-time',
    displayName: 'Seconds From Time',
    description: 'Returns the seconds from an xs:time value.',
    returnType: Types.Decimal,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Time, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'timezone-from-time',
    displayName: 'Timezone From Time',
    description: 'Returns the timezone from an xs:time value.',
    returnType: Types.DayTimeDuration,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Time, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'adjust-dateTime-to-timezone',
    displayName: 'Adjust DateTime to Timezone',
    description: 'Adjusts an xs:dateTime value to a specific timezone, or to no timezone at all.',
    returnType: Types.DateTime,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.DateTime, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'timezone',
        displayName: '$timezone',
        description: '$timezone',
        type: Types.DayTimeDuration,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'adjust-date-to-timezone',
    displayName: 'Adjust Date to Timezone',
    description: 'Adjusts an xs:date value to a specific timezone, or to no timezone at all.',
    returnType: Types.Date,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Date, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'timezone',
        displayName: '$timezone',
        description: '$timezone',
        type: Types.DayTimeDuration,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'adjust-time-to-timezone',
    displayName: 'Adjust Time to Timezone',
    description: 'Adjusts an xs:time value to a specific timezone, or to no timezone at all.',
    returnType: Types.Time,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Time, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'timezone',
        displayName: '$timezone',
        description: '$timezone',
        type: Types.DayTimeDuration,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
] as IFunctionDefinition[];
