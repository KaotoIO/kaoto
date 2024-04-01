import { FunctionComponent } from 'react';
import { useDataMapper } from '../../hooks';
import {
  Card,
  CardBody,
  CardTitle,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelContent,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { IField } from '../../models';
import { DeleteMappingButton } from '../../components/mapping/DeleteMappingButton';

type FieldDetailsProps = {
  field: IField;
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

export const MappingDetailsDrawerPanel: FunctionComponent = () => {
  const { selectedMapping, setSelectedMapping } = useDataMapper();

  return (
    selectedMapping && (
      <DrawerPanelContent>
        <DrawerHead>
          <TextContent>
            <Text component={TextVariants.h5}>Mapping Details</Text>
          </TextContent>
          <DrawerActions>
            <DeleteMappingButton mapping={selectedMapping} onDelete={() => setSelectedMapping(null)} />
            <DrawerCloseButton onClick={() => setSelectedMapping(null)} />
          </DrawerActions>
        </DrawerHead>
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
                  {selectedMapping.targetFields.map((field) => (
                    <StackItem>
                      <FieldDetails field={field} />
                    </StackItem>
                  ))}
                </Stack>
              </CardBody>
            </Card>
          </StackItem>
        </Stack>
      </DrawerPanelContent>
    )
  );
};
