import {
  Array,
  Boolean,
  CalendarHeatMap,
  CarbonIconProps,
  CharacterDecimal,
  Document,
  EventSchedule,
  Help,
  Hourglass,
  Http,
  Object,
  StringInteger,
  StringText,
  Time,
} from '@carbon/icons-react';
import { FunctionComponent } from 'react';

import { Types } from '../../models/datamapper';

interface FieldIconProps {
  type?: Types;
  className?: string;
}

const renderFieldIcon = (type: Types | undefined, props: CarbonIconProps) => {
  const title = <title>{type}</title>;

  switch (type) {
    case Types.String:
      return <StringText {...props}>{title}</StringText>;

    case Types.Integer:
    case Types.PositiveInteger:
      return <StringInteger {...props}>{title}</StringInteger>;

    case Types.Float:
    case Types.Double:
    case Types.Decimal:
    case Types.Numeric:
      return <CharacterDecimal {...props}>{title}</CharacterDecimal>;

    case Types.Boolean:
      return <Boolean {...props}>{title}</Boolean>;
    case Types.Date:
      return <CalendarHeatMap {...props}>{title}</CalendarHeatMap>;
    case Types.Time:
      return <Time {...props}>{title}</Time>;

    case Types.DateTime:
      return <EventSchedule {...props}>{title}</EventSchedule>;
    case Types.Duration:
    case Types.DayTimeDuration:
      return <Hourglass {...props}>{title}</Hourglass>;

    case Types.Container:
      return <Object {...props}>{title}</Object>;
    case Types.Array:
      return <Array {...props}>{title}</Array>;
    case Types.DocumentNode:
      return <Document {...props}>{title}</Document>;
    case Types.AnyURI:
      return <Http {...props}>{title}</Http>;

    case Types.AnyAtomicType:
    case Types.AnyType:
      return <Help {...props}>{title}</Help>;

    case Types.QName:
    case Types.NCName:
    case Types.Item:
    case Types.Element:
    case Types.Node:
    default:
      return null;
  }
};

export const FieldIcon: FunctionComponent<FieldIconProps> = ({ type, className }) =>
  renderFieldIcon(type, { className });
