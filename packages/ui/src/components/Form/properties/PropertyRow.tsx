import { Button, HelperText, HelperTextItem, Split, SplitItem, TextInput } from '@patternfly/react-core';
import { CheckIcon, PencilAltIcon, TimesIcon, TrashIcon } from '@patternfly/react-icons';
import { Td, TdProps, TreeRowWrapper } from '@patternfly/react-table';
import { FormEvent, useState } from 'react';
import { AddPropertyButtons } from './AddPropertyButtons';

type PropertyRowProps = {
  propertyName: string;
  nodeName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodeValue: any;
  path: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  }

  function getKey() {
    return `${propertyName}-${path.join('-')}${isPlaceholder ? '-placeholder' : ''}`;
  }

  return (
    <TreeRowWrapper key={getKey()} row={{ props: treeRow!.props }}>
      <Td
        data-testid={`${getKey()}-name-label`}
        className="properties-field__row__value"
        dataLabel="NAME"
        treeRow={treeRow}
      >
        {isEditing ? (
          <>
            <TextInput
              autoFocus
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
          <>{nodeName}</>
        )}
      </Td>

      <Td data-testid={`${getKey()}-value-label`} className="properties-field__row__value" dataLabel="VALUE">
        {isObject && !isEditing && <AddPropertyButtons path={path} createPlaceholder={createPlaceholder} />}

        {!isObject && isEditing && (
          <TextInput
            aria-label={`${getKey()}-value`}
            data-testid={`${getKey()}-value-input`}
            name={`properties-input-${getKey()}-value`}
            type="text"
            value={userInputValue}
            onKeyDown={(event) => event.stopPropagation()}
            onChange={(event, value) => handleUserInputValue(value, event)}
          />
        )}

        {!isObject && !isEditing && <>{nodeValue}</>}
      </Td>

      <Td isActionCell className="properties-field__row__action" data-column-type="action">
        <Split>
          {isEditing
            ? [
                <SplitItem key={`${getKey()}-property-edit-confirm-${nodeName}`}>
                  <Button
                    title="Confirm edit"
                    data-testid={`${getKey()}-property-edit-confirm-${nodeName}-btn`}
                    icon={<CheckIcon />}
                    variant="link"
                    isDisabled={isUserInputInvalid()}
                    onClick={commitUserInput}
                  />
                </SplitItem>,
                <SplitItem key={`${getKey()}-property-edit-cancel-${nodeName}`}>
                  <Button
                    title="Cancel edit"
                    data-testid={`${getKey()}-property-edit-cancel-${nodeName}-btn`}
                    icon={<TimesIcon />}
                    variant="link"
                    onClick={cancelEditing}
                  />
                </SplitItem>,
              ]
            : [
                <SplitItem key={`${getKey()}-property-edit-${nodeName}`}>
                  <Button
                    title="Edit property"
                    data-testid={`${getKey()}-property-edit-${nodeName}-btn`}
                    icon={<PencilAltIcon />}
                    variant="link"
                    onClick={() => setIsEditing(true)}
                  />
                </SplitItem>,
                <SplitItem key={`${getKey()}-property-edit-spacer-${nodeName}`} />,
              ]}
          <SplitItem key={`${getKey()}-property-delete-${nodeName}`}>
            <Button
              title="Delete property"
              data-testid={`${getKey()}-delete-${nodeName}-btn`}
              icon={<TrashIcon />}
              variant="link"
              onClick={() => handleTrashClick(parentModel, nodeName)}
            />
          </SplitItem>
        </Split>
      </Td>
    </TreeRowWrapper>
  );
}
