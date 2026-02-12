import { Typeahead, TypeaheadItem } from '@kaoto/forms';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';

import { CreateDocumentResult, RootElementOption } from '../../../../models/datamapper/document';
import { DocumentService } from '../../../../services/document.service';

type RootElementSelectProps = {
  createDocumentResult: CreateDocumentResult;
  onUpdate: (option: RootElementOption) => void;
};

export const RootElementSelect: FunctionComponent<RootElementSelectProps> = ({ createDocumentResult, onUpdate }) => {
  const rootQName = DocumentService.getRootElementQName(createDocumentResult.document);
  const initialSelectedOption = rootQName
    ? createDocumentResult.rootElementOptions?.find(
        (option) =>
          option.namespaceUri === (rootQName.getNamespaceURI() || '') && option.name === rootQName.getLocalPart(),
      )
    : undefined;

  const [selectedItem, setSelectedItem] = useState<TypeaheadItem | undefined>(
    initialSelectedOption
      ? {
          name: initialSelectedOption.name,
          value: initialSelectedOption.name,
          description: initialSelectedOption.namespaceUri,
        }
      : undefined,
  );

  const items: TypeaheadItem[] = useMemo(() => {
    if (!createDocumentResult?.rootElementOptions) return [];
    return createDocumentResult.rootElementOptions.map((option) => ({
      name: option.name,
      value: option.name,
      description: option.namespaceUri ? `Namespace URI: ${option.namespaceUri}` : undefined,
    }));
  }, [createDocumentResult?.rootElementOptions]);

  const handleSelectionChange = useCallback(
    (item?: TypeaheadItem) => {
      if (!createDocumentResult.rootElementOptions || !item?.value) return;
      const option = createDocumentResult.rootElementOptions.find((opt) => opt.name === item.value);
      if (option) {
        onUpdate(option);
        setSelectedItem(item);
      }
    },
    [createDocumentResult.rootElementOptions, onUpdate],
  );

  return (
    <Typeahead
      id="attach-schema-root-element"
      data-testid="attach-schema-root-element"
      aria-label="Attach schema / Choose Root Element"
      placeholder={selectedItem?.name}
      selectedItem={selectedItem}
      onChange={handleSelectionChange}
      items={items}
    />
  );
};
