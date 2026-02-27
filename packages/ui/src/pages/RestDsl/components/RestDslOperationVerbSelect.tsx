import { Button, MenuToggle, Popover, Select, SelectList, SelectOption } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { FunctionComponent, useMemo } from 'react';

import { RestVerb } from '../restDslTypes';

type OperationVerbToggleProps = {
  toggleRef: React.Ref<HTMLButtonElement>;
  operationVerb: RestVerb;
  onToggle: () => void;
};

const OperationVerbToggle: FunctionComponent<OperationVerbToggleProps> = ({ toggleRef, operationVerb, onToggle }) => {
  return (
    <MenuToggle ref={toggleRef} onClick={onToggle}>
      {operationVerb.toUpperCase()}
    </MenuToggle>
  );
};

const createOperationVerbToggleRenderer =
  (operationVerb: RestVerb, onToggle: () => void) => (toggleRef: React.Ref<HTMLButtonElement>) => (
    <OperationVerbToggle toggleRef={toggleRef} operationVerb={operationVerb} onToggle={onToggle} />
  );

export const OperationTypeHelp: FunctionComponent = () => (
  <Popover
    bodyContent="Select the HTTP method to create for this REST operation."
    triggerAction="hover"
    withFocusTrap={false}
  >
    <Button variant="plain" aria-label="More info about Operation Type" icon={<HelpIcon />} />
  </Popover>
);

type RestDslOperationVerbSelectProps = {
  isOpen: boolean;
  selected: RestVerb;
  verbs: RestVerb[];
  onSelect: (value: RestVerb) => void;
  onOpenChange: (isOpen: boolean) => void;
  onToggle: () => void;
};

export const RestDslOperationVerbSelect: FunctionComponent<RestDslOperationVerbSelectProps> = ({
  isOpen,
  selected,
  verbs,
  onSelect,
  onOpenChange,
  onToggle,
}) => {
  const toggleRenderer = useMemo(() => createOperationVerbToggleRenderer(selected, onToggle), [selected, onToggle]);

  return (
    <Select
      isOpen={isOpen}
      selected={selected}
      onSelect={(_event, value) => onSelect(value as RestVerb)}
      onOpenChange={onOpenChange}
      toggle={toggleRenderer}
    >
      <SelectList>
        {verbs.map((verb) => (
          <SelectOption key={verb} itemId={verb}>
            {verb.toUpperCase()}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
