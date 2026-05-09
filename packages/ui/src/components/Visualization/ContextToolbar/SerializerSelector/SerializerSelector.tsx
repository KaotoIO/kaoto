import './SerializerSelector.scss';

import { MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
import { FunctionComponent, RefObject, useContext, useState } from 'react';

import { SerializerType } from '../../../../models/kaoto-resource';
import { EntitiesContext } from '../../../../providers';

export const SerializerSelector: FunctionComponent = () => {
  const { camelResource, updateSourceCodeFromEntities } = useContext(EntitiesContext)!;
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<SerializerType>(camelResource.getSerializerType());

  const onSelect = (serializer: SerializerType) => {
    setSelected(serializer);
    if (serializer !== selected) {
      camelResource.setSerializer(serializer);
      updateSourceCodeFromEntities();
      setIsOpen(false);
    }
  };

  const toggle = (toggleRef: RefObject<HTMLButtonElement>) => (
    <MenuToggle
      data-testid="serializer-list-dropdown"
      ref={toggleRef}
      onClick={() => {
        setIsOpen(!isOpen);
      }}
      isExpanded={isOpen}
    >
      {selected}
    </MenuToggle>
  );

  return (
    <Select
      id="serializer-list-select"
      isOpen={isOpen}
      onSelect={(_event, value) => {
        onSelect(value as SerializerType);
      }}
      onOpenChange={(isOpen) => {
        setIsOpen(isOpen);
      }}
      toggle={toggle}
    >
      <SelectList>
        <SelectOption
          key="serializer-xml"
          data-testid="serializer-xml"
          itemId="XML"
          value={SerializerType.XML}
          isDisabled={selected === SerializerType.XML}
        >
          XML
        </SelectOption>
        <SelectOption
          key="serializer-yaml"
          data-testid="serializer-yaml"
          itemId="YAML"
          value={SerializerType.YAML}
          isDisabled={selected === SerializerType.YAML}
        >
          YAML
        </SelectOption>
      </SelectList>
    </Select>
  );
};
