import { FunctionComponent, RefObject, useContext, useState } from 'react';
import { MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
import { XmlCamelResourceSerializer, YamlCamelResourceSerializer } from '../../../../serializers';
import { EntitiesContext } from '../../../../providers';

export const SerializerSelector: FunctionComponent = () => {
  const { camelResource, updateSourceCodeFromEntities } = useContext(EntitiesContext)!;
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<'XML' | 'YAML'>(camelResource.getSerializer().getLabel() as 'XML' | 'YAML');

  function onSelect(serializer: string) {
    setSelected(serializer as 'XML' | 'YAML');
    if (serializer !== selected) {
      camelResource.setSerializer(
        serializer === 'XML' ? new XmlCamelResourceSerializer() : new YamlCamelResourceSerializer(),
      );
      updateSourceCodeFromEntities();
      setIsOpen(false);
    }
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
      onSelect={(_event, value) => onSelect(value as string)}
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
      toggle={toggle}
      style={{ width: '20rem' }}
    >
      <SelectList>
        <SelectOption
          key={`serializer-yaml`}
          data-testid={`serializer-yaml`}
          itemId={'XML'}
          value={'XML'}
          isDisabled={selected === 'XML'}
        >
          XML
        </SelectOption>
        <SelectOption
          key={`serializer-xml`}
          data-testid={`serializer-yaml`}
          itemId={'YAML'}
          value={'YAML'}
          isDisabled={selected === 'YAML'}
        >
          YAML
        </SelectOption>
      </SelectList>
    </Select>
  );
};
