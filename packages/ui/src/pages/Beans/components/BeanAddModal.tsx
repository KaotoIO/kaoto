import { CanvasFormTabsProvider, isDefined, KaotoForm, KaotoFormApi } from '@kaoto/forms';
import { mapValues, omitBy, pick, startCase } from 'lodash';
import { FunctionComponent, useCallback, useMemo, useRef, useState } from 'react';

import { EditorModal } from '../../../components/EditorShell';
import { KaotoSchemaDefinition } from '../../../models/kaoto-schema';

export interface BeanAddModalProps {
  open: boolean;
  /** Schema of a single bean. Its required properties and the type are asked for; the type is only validated when required. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
  onClose: () => void;
  onAddBean: (bean: Record<string, string>) => void;
}

/**
 * Modal dialog for adding a new bean. Displays a form with the required bean properties and the type,
 * which depending on the catalog version may be optional.
 */
export const BeanAddModal: FunctionComponent<BeanAddModalProps> = ({ open, schema, onClose, onAddBean }) => {
  const [formModel, setFormModel] = useState<Record<string, string>>({});
  const formRef = useRef<KaotoFormApi>(null);

  const addSchema = useMemo((): KaotoSchemaDefinition['schema'] => {
    const required: string[] = schema?.required ?? [];
    const fields = [...new Set([...required, 'type'])];
    const properties = mapValues(pick(schema?.properties, fields), (property, key) => ({
      title: startCase(key),
      ...property,
    }));
    return { type: 'object', title: 'Add bean', properties, required };
  }, [schema]);

  const handleAdd = useCallback(() => {
    const valid = formRef.current?.validate();
    if (!isDefined(valid)) {
      onAddBean(omitBy(formModel, (value) => value === '') as Record<string, string>);
      onClose();
    }
  }, [formModel, onAddBean, onClose]);

  const onChangeProp = (propName: string, value: unknown) => {
    const parsedValue = typeof value === 'string' ? value.trim() : value;
    setFormModel((prev) => ({ ...prev, [propName]: parsedValue }) as Record<string, string>);
  };

  return (
    <EditorModal open={open} title="Add bean" testId="bean-add-modal" onClose={onClose} onSubmit={handleAdd}>
      <CanvasFormTabsProvider tab="All">
        <KaotoForm schema={addSchema} model={formModel} onChangeProp={onChangeProp} ref={formRef} />
      </CanvasFormTabsProvider>
    </EditorModal>
  );
};
