import './FunctionIcon.scss';

import { FunctionComponent } from 'react';

export const FunctionIcon: FunctionComponent = () => {
  return (
    <i>
      <b>
        f<small className="function-icon">(x)</small>
      </b>
    </i>
  );
};
