import { FunctionComponent } from 'react';

interface FieldDetailRowProps {
  label: string;
  value: string;
}

export const FieldDetailRow: FunctionComponent<FieldDetailRowProps> = ({ label, value }) => {
  return (
    <div className="field__row">
      <span className="field__cell field__cell--title">{label}:</span>
      <span className="field__cell">{value}</span>
    </div>
  );
};
