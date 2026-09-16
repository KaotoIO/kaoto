import { Tile } from '@carbon/react';
import { FunctionComponent } from 'react';
import { IDataTestID } from '../models';
import { FieldProps } from '../models/typings';
import { CustomExpandableSection } from '../Form/customField/CustomExpandableSection';

export const DisabledField: FunctionComponent<IDataTestID & FieldProps> = (props) => {
  return (
    <Tile>
      <h4 className="cds--tile-heading">{props.propName}</h4>
      <div>
        <p>Configuring this field is not yet supported</p>

        <CustomExpandableSection groupName={props.propName}>
          <code>
            <pre>{JSON.stringify(props, null, 2)}</pre>
          </code>
        </CustomExpandableSection>
      </div>
    </Tile>
  );
};
