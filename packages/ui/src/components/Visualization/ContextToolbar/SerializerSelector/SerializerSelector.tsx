import './SerializerSelector.scss';

import { MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
import { FunctionComponent, RefObject, useContext, useEffect, useState } from 'react';

import { SerializerType } from '../../../../models/kaoto-resource';
import { EntitiesContext } from '../../../../providers';

export const SerializerSelector: FunctionComponent = () => {
  const { camelResource, updateSourceCodeFromEntities, isLoading } = useContext(EntitiesContext)!;
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<SerializerType | undefined>(camelResource?.getSerializerType());

  useEffect(() => {
    if (!camelResource) {
      return;
    }
    setSelected(camelResource.getSerializerType());
  }, [camelResource]);

  const onSelect = async (serializer: SerializerType) => {
    setSelected(serializer);
    if (camelResource && serializer !== selected) {
      camelResource.setSerializer(serializer);
      await updateSourceCodeFromEntities();
      setIsOpen(false);
    }
  };

  if (isLoading || !camelResource) {
    return null;
  }

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
