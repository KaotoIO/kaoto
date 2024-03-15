import { FunctionComponent } from 'react';
import { useDataMapper } from '../../hooks';
import { Card, CardBody, CardTitle, Stack, StackItem } from '@patternfly/react-core';
import { IMappedField } from '../../models';

type FieldDetailsProps = {
  field: IMappedField;
};

const FieldDetails: FunctionComponent<FieldDetailsProps> = ({ field }) => {
  return (
    <ul>
      <li>name: {field.name}</li>
      <li>type: {field.type}</li>
      <li>path: {field.fieldIdentifier.toString()}</li>
      {field.defaultValue && <li>defaultValue: {field.defaultValue}</li>}
      <li>minOccurs: {field.minOccurs}</li>
      <li>maxOccurs: {field.maxOccurs}</li>
    </ul>
  );
};

export const MappingDetailsView: FunctionComponent = () => {
  const { selectedMapping } = useDataMapper();

  return (
    selectedMapping && (
      <Card isCompact>
        <CardTitle>Mapping Details</CardTitle>
        <CardBody>
          <Stack>
            <StackItem>
              <Card isCompact>
                <CardTitle>Source</CardTitle>
                <CardBody>
                  <Stack>
                    {selectedMapping.sourceFields.map((field) => (
                      <StackItem>
                        <FieldDetails field={field} />
                      </StackItem>
                    ))}
                  </Stack>
                </CardBody>
              </Card>
            </StackItem>
            <StackItem>
              <Card isCompact>
                <CardTitle>Transformation</CardTitle>
                <CardBody>TODO</CardBody>
              </Card>
            </StackItem>
            <StackItem>
              <Card isCompact>
                <CardTitle>Target</CardTitle>
                <CardBody>
                  <Stack>
                    {selectedMapping.sourceFields.map((field) => (
                      <StackItem>
                        <FieldDetails field={field} />
                      </StackItem>
                    ))}
                  </Stack>
                </CardBody>
              </Card>
            </StackItem>
          </Stack>
        </CardBody>
      </Card>
    )
  );
};
