import { Card, CardBody, CardTitle } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { IDataTestID } from '../../../../../models';
import { FieldProps } from '../typings';
import { CustomExpandableSection } from '../../../../Form/customField/CustomExpandableSection';

export const DisabledField: FunctionComponent<IDataTestID & FieldProps> = (props) => {
  return (
    <Card>
      <CardTitle>{props.propName}</CardTitle>
      <CardBody>
        <p>Configuring this field is not yet supported</p>

        <CustomExpandableSection groupName={props.propName}>
          <code>
            <pre>{JSON.stringify(props, null, 2)}</pre>
          </code>
        </CustomExpandableSection>
      </CardBody>
    </Card>
  );
};
