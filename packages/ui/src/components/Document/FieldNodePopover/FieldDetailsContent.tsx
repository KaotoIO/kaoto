import './FieldDetailsContent.scss';

import { FunctionComponent } from 'react';

import { LabelValuePair } from './field-details-utils';
import { FieldDetailRow } from './FieldDetailRow';

interface FieldDetailsContentProps {
  items: LabelValuePair[];
}

export const FieldDetailsContent: FunctionComponent<FieldDetailsContentProps> = ({ items }) => {
  return (
    <div className="field__content">
      {items.map(({ label, value }) => (
        <FieldDetailRow key={label} label={label} value={value} />
      ))}
    </div>
  );
};
