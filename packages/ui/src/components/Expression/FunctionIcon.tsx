import { FunctionComponent } from 'react';
import './Transformation.scss';

export const FunctionIcon: FunctionComponent = () => {
  return (
    <i>
      <b>
        f<small className="function-icon">(x)</small>
      </b>
    </i>
  );
};
