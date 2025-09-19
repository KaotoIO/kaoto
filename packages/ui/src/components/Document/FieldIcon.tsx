import {
  Array,
  Boolean,
  CalendarHeatMap,
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
import { Icon } from '@patternfly/react-core';
import { FunctionComponent, useMemo } from 'react';
import { Types } from '../../models/datamapper';

interface FieldIconProps {
  type?: Types;
  className?: string;
}

export const FieldIcon: FunctionComponent<FieldIconProps> = ({ type, className }) => {
  const iconNode = useMemo(() => {
    switch (type) {
      case Types.String:
        return <StringText />;

      case Types.Integer:
      case Types.PositiveInteger:
        return <StringInteger />;

      case Types.Float:
      case Types.Double:
      case Types.Decimal:
      case Types.Numeric:
        return <CharacterDecimal />;

      case Types.Boolean:
        return <Boolean />;
      case Types.Date:
        return <CalendarHeatMap />;
      case Types.Time:
        return <Time />;

      case Types.DateTime:
        return <EventSchedule />;
      case Types.Duration:
      case Types.DayTimeDuration:
        return <Hourglass />;

      case Types.Container:
        return <Object />;
      case Types.Array:
        return <Array />;
      case Types.DocumentNode:
        return <Document />;
      case Types.AnyURI:
        return <Http />;

      case Types.AnyAtomicType:
      case Types.AnyType:
        return <Help />;

      case Types.QName:
      case Types.NCName:
      case Types.Item:
      case Types.Element:
      case Types.Node:
      default:
        return null;
    }
  }, [type]);

  return (
    <Icon className={className} title={type}>
      {iconNode}
    </Icon>
  );
};
