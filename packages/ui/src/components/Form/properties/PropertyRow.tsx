import { Button, HelperText, HelperTextItem, Split, SplitItem, TextInput, Tooltip } from '@patternfly/react-core';
import { CheckIcon, PencilAltIcon, TimesIcon, TrashIcon } from '@patternfly/react-icons';
import { Td, TdProps, TreeRowWrapper } from '@patternfly/react-table';
import { FormEvent, useState } from 'react';
import '../../MetadataEditor/MetadataEditor.css';
import { AddPropertyButtons } from './AddPropertyButtons';

type PropertyRowProps = {
  propertyName: string;
  nodeName: string;
  nodeValue: any;
  path: string[];
  parentModel: any;
  treeRow: TdProps['treeRow'];
  isObject: boolean;
  onChangeModel: () => void;
  createPlaceholder: (isObject: boolean) => void;
  isPlaceholder?: boolean;
};

/**
 * Represents a row in the {@link PropertiesField} table.
 * @param propertyName
 * @param nodeName
 * @param nodeValue
 * @param path
 * @param parentModel
 * @param treeRow
 * @param isObject
 * @param onChangeModel
 * @constructor
 */
export function PropertyRow({
  propertyName,
  nodeName,
  nodeValue,
  path,
  parentModel,
  treeRow,
  isObject,
  onChangeModel,
  createPlaceholder,
  isPlaceholder = false,
}: PropertyRowProps) {
  function handleTrashClick(parentModel: any, nodeName: string) {
    delete parentModel[nodeName];
    onChangeModel();
  }
  const [userInputValue, setUserInputValue] = useState<string>(nodeValue);
  const [userInputName, setUserInputName] = useState<string>(nodeName);
  const [isUserInputNameDuplicate, setUserInputNameDuplicate] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(isPlaceholder);

  function handleUserInputName(name: string, event: FormEvent<HTMLInputElement>) {
    event.stopPropagation();
    setUserInputName(name);
    setUserInputNameDuplicate(!!(name && name !== nodeName && parentModel[name] != null));
  }

  function handleUserInputValue(value: string, event: FormEvent<HTMLInputElement>) {
    event.stopPropagation();
    setUserInputValue(value);
  }

  function isUserInputInvalid() {
    return !userInputName || isUserInputNameDuplicate;
  }

  function commitUserInput() {
    const value = userInputValue != null && userInputValue !== nodeValue ? userInputValue : nodeValue;
    if (!isUserInputInvalid() && userInputName !== nodeName) {
      delete parentModel[nodeName];
      parentModel[userInputName] = value;
      onChangeModel();
    } else if (value !== nodeValue) {
      parentModel[nodeName] = value;
      onChangeModel();
    }
    cancelEditing();
  }

  function cancelEditing() {
    setUserInputName(nodeName);
    setUserInputValue(nodeValue);
    setIsEditing(false);
    if (isPlaceholder) {
      onChangeModel();
    }
  }

  function getKey() {
    return `${propertyName}-${path.join('-')}${isPlaceholder ? '-placeholder' : ''}`;
  }

  return (
    <TreeRowWrapper key={getKey()} row={{ props: treeRow!.props }}>
      <Td dataLabel="NAME" treeRow={treeRow}>
        {isEditing ? (
          <>
            <TextInput
              autoFocus={true}
              aria-label={`${getKey()}-name`}
              data-testid={`${getKey()}-name-input`}
              name={`properties-input-${getKey()}-name`}
              type="text"
              aria-invalid={isUserInputNameDuplicate}
              value={userInputName}
              onKeyDown={(event) => event.stopPropagation()}
              onChange={(event, value) => handleUserInputName(value, event)}
            />
            {isUserInputNameDuplicate && (
              <HelperText>
                <HelperTextItem variant="error">Please specify a unique property name</HelperTextItem>
              </HelperText>
            )}
          </>
        ) : (
          <div data-testid={`${getKey()}-name-label`}>{nodeName}</div>
        )}
      </Td>
      <Td dataLabel="VALUE">
        {(() => {
          if (isObject && !isEditing) {
            return <AddPropertyButtons path={path} createPlaceholder={createPlaceholder} />;
          } else if (!isObject && isEditing) {
            return (
              <TextInput
                aria-label={`${getKey()}-value`}
                data-testid={`${getKey()}-value-input`}
                name={`properties-input-${getKey()}-value`}
                type="text"
                value={userInputValue}
                onKeyDown={(event) => event.stopPropagation()}
                onChange={(event, value) => handleUserInputValue(value, event)}
              />
            );
          } else if (!isObject && !isEditing) {
            return <div data-testid={`${getKey()}-value-label`}>{nodeValue}</div>;
          } else {
            return <></>;
          }
        })()}
      </Td>
      <Td isActionCell>
        <Split>
          {isEditing
            ? [
                <SplitItem key={`${getKey()}-property-edit-confirm-${nodeName}`}>
                  <Tooltip content="Confirm edit">
                    <Button
                      data-testid={`${getKey()}-property-edit-confirm-${nodeName}-btn`}
                      icon={<CheckIcon />}
                      variant="link"
                      isDisabled={isUserInputInvalid()}
                      onClick={commitUserInput}
                    />
                  </Tooltip>
                </SplitItem>,
                <SplitItem key={`${getKey()}-property-edit-cancel-${nodeName}`}>
                  <Tooltip content="Cancel edit">
                    <Button
                      data-testid={`${getKey()}-property-edit-cancel-${nodeName}-btn`}
                      icon={<TimesIcon />}
                      variant="link"
                      onClick={cancelEditing}
                    />
                  </Tooltip>
                </SplitItem>,
              ]
            : [
                <SplitItem key={`${getKey()}-property-edit-${nodeName}`}>
                  <Tooltip content="Edit property">
                    <Button
                      data-testid={`${getKey()}-property-edit-${nodeName}-btn`}
                      icon={<PencilAltIcon />}
                      variant="link"
                      onClick={() => setIsEditing(true)}
                    />
                  </Tooltip>
                </SplitItem>,
                <SplitItem key={`${getKey()}-property-edit-spacer-${nodeName}`}></SplitItem>,
              ]}
          <SplitItem key={`${getKey()}-property-delete-${nodeName}`}>
            <Tooltip content="Delete property">
              <Button
                data-testid={`${getKey()}-delete-${nodeName}-btn`}
                icon={<TrashIcon />}
                variant="link"
                onClick={() => handleTrashClick(parentModel, nodeName)}
              ></Button>
            </Tooltip>
          </SplitItem>
        </Split>
      </Td>
    </TreeRowWrapper>
  );
}
