import { FunctionComponent, useCallback, useMemo, useState } from 'react';
import { useDataMapper } from '../../hooks';
import {
  ActionList,
  ActionListItem,
  Button,
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
  Tooltip,
} from '@patternfly/react-core';
import { IField } from '../../models';
import { DeleteMappingButton } from './DeleteMappingButton';
import { Table, TableVariant, Tbody, Td, Tr } from '@patternfly/react-table';
import { PenIcon, SaveIcon, TimesIcon } from '@patternfly/react-icons';
import { TransformationEditor } from '../transformation/TransformationEditor';

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

type MappingDetailsDrawerPanelProps = {
  onToggleEditMode: (isEditMode: boolean) => void;
};

export const MappingDetailsDrawerPanel: FunctionComponent<MappingDetailsDrawerPanelProps> = ({ onToggleEditMode }) => {
  const { selectedMapping, setSelectedMapping } = useDataMapper();
  const [isEditMode, setEditMode] = useState<boolean>(false);

  const handleToggleEditMode = useCallback(
    (isEditMode: boolean) => {
      setEditMode(isEditMode);
      onToggleEditMode(isEditMode);
    },
    [onToggleEditMode],
  );

  const handleCloseDetails = useCallback(() => {
    handleToggleEditMode(false);
    setSelectedMapping(null);
  }, [handleToggleEditMode, setSelectedMapping]);

  const handleSaveTransformation = useCallback(() => {
    handleToggleEditMode(false);
  }, [handleToggleEditMode]);

  const handleCancelEditTransformation = useCallback(() => {
    handleToggleEditMode(false);
  }, [handleToggleEditMode]);

  const headerActions = useMemo(() => {
    return (
      <ActionList isIconList={true}>
        {isEditMode ? (
          <>
            <ActionListItem>
              <Tooltip position={'auto'} enableFlip={true} content={<div>Save Transformation</div>}>
                <Button
                  variant="plain"
                  aria-label="Save Transformation"
                  data-testid={`save-transformation-button`}
                  onClick={handleSaveTransformation}
                >
                  <SaveIcon />
                </Button>
              </Tooltip>
            </ActionListItem>
            <ActionListItem>
              <Tooltip position={'auto'} enableFlip={true} content={<div>Cancel Edit Transformation</div>}>
                <Button
                  variant="plain"
                  aria-label="Cancel Edit Transformation"
                  data-testid={`cancel-edit-transformation-button`}
                  onClick={handleCancelEditTransformation}
                >
                  <TimesIcon />
                </Button>
              </Tooltip>
            </ActionListItem>
          </>
        ) : (
          <ActionListItem>
            <Tooltip position={'auto'} enableFlip={true} content={<div>Edit Transformation</div>}>
              <Button
                variant="plain"
                aria-label="Edit Transformation"
                data-testid={`edit-transformation-button`}
                onClick={() => handleToggleEditMode(true)}
              >
                <PenIcon />
              </Button>
            </Tooltip>
          </ActionListItem>
        )}
      </ActionList>
    );
  }, [handleCancelEditTransformation, handleSaveTransformation, handleToggleEditMode, isEditMode]);

  return (
    selectedMapping && (
      <DrawerPanelContent widths={isEditMode ? { default: 'width_66' } : undefined}>
        <DrawerHead>
          <TextContent>
            <Text component={TextVariants.h5}>Mapping Details{isEditMode && ' / Edit Transformation'}</Text>
          </TextContent>
          <DrawerActions>
            <DeleteMappingButton mapping={selectedMapping} onDelete={() => setSelectedMapping(null)} />
            <DrawerCloseButton onClick={handleCloseDetails} />
          </DrawerActions>
        </DrawerHead>
        {isEditMode ? (
          <Card isCompact>
            <CardHeader actions={{ actions: headerActions, hasNoOffset: true }}>
              <CardTitle>Target Field : {selectedMapping.targetFields[0].fieldIdentifier.toString()}</CardTitle>
            </CardHeader>
            <CardBody>
              <TransformationEditor />
            </CardBody>
          </Card>
        ) : (
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
                        <TextInput id="xpath" value={selectedMapping.xpath} readOnlyVariant="default" />
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
        )}
      </DrawerPanelContent>
    )
  );
};
