import { Title } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { Visualization } from '../../components/Visualization';
import './DesignPage.scss';

export const DesignPage: FunctionComponent = () => {
  return (
    <div className="canvasPage">
      <Title headingLevel="h1">Visualization</Title>

      <Visualization className="canvasPage__canvas" />
    </div>
  );
};
