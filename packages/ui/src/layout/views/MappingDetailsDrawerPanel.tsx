import { FunctionComponent, useMemo } from 'react';
import { useDataMapper } from '../../hooks';
import {
  ActionList,
  ActionListItem,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelContent,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextInput,
  TextVariants,
} from '@patternfly/react-core';
import { IField } from '../../models';
import { DeleteMappingButton } from '../../components/mapping/DeleteMappingButton';
import { Table, TableVariant, Tbody, Td, Tr } from '@patternfly/react-table';
import { EditXPathButton } from '../../components/mapping/EditXPathButton';

type FieldDetailsProps = {
  field: IField;
};

const FieldDetails: FunctionComponent<FieldDetailsProps> = ({ field }) => {
  return (
    <Table variant={TableVariant.compact} borders={false}>
      <Tbody>
        <Tr>
          <Td key="name">name</Td>
          <Td key="value">{field.name}</Td>
        </Tr>
        <Tr>
          <Td key="name">type</Td>
          <Td key="value">{field.type}</Td>
        </Tr>
        <Tr>
          <Td key="name">path</Td>
          <Td key="value">{field.fieldIdentifier.toString()}</Td>
        </Tr>
        {field.defaultValue && (
          <Tr>
            <Td key="name">defaultValue</Td>
            <Td key="value">{field.defaultValue}</Td>
          </Tr>
        )}
        <Tr>
          <Td key="name">minOccurs</Td>
          <Td key="value">{field.minOccurs}</Td>
        </Tr>
        <Tr>
          <Td key="name">maxOccurs</Td>
          <Td key="value">{field.maxOccurs}</Td>
        </Tr>
      </Tbody>
    </Table>
  );
};

export const MappingDetailsDrawerPanel: FunctionComponent = () => {
  const { selectedMapping, setSelectedMapping } = useDataMapper();

  const headerActions = useMemo(() => {
    return (
      <ActionList isIconList={true}>
        <ActionListItem>
          <EditXPathButton mapping={selectedMapping} />
        </ActionListItem>
      </ActionList>
    );
  }, [selectedMapping]);

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
              <CardHeader actions={{ actions: headerActions, hasNoOffset: true }}>
                <CardTitle>Source</CardTitle>
              </CardHeader>
              <CardBody>
                <Stack>
                  {selectedMapping.xpath ? (
                    <StackItem>
                      XPath
                      <TextInput value={selectedMapping.xpath} readOnlyVariant="default" />
                    </StackItem>
                  ) : (
                    selectedMapping.sourceFields.map((field) => (
                      <StackItem key={field.name}>
                        <FieldDetails field={field} />
                      </StackItem>
                    ))
                  )}
                </Stack>
              </CardBody>
            </Card>
          </StackItem>
          <StackItem>
            <Card isCompact>
              <CardHeader>
                <CardTitle>Target</CardTitle>
              </CardHeader>
              <CardBody>
                <Stack>
                  {selectedMapping.targetFields.map((field) => (
                    <StackItem key={field.name}>
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
