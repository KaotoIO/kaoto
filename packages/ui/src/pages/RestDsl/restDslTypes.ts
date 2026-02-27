import { REST_DSL_VERBS } from '../../models/special-processors.constants';

export type RestVerb = (typeof REST_DSL_VERBS)[number];

export type RestEditorSelection =
  | { kind: 'restConfiguration' }
  | { kind: 'rest'; restId: string }
  | { kind: 'operation'; restId: string; verb: RestVerb; index: number };

export type FormEntity = {
  getNodeSchema: (path: string) => unknown;
  getNodeDefinition: (path: string) => unknown;
  getRootPath: () => string;
  updateModel: (path: string | undefined, value: unknown) => void;
};

export type SelectedFormState = {
  title?: string;
  entity: FormEntity;
  path: string;
  omitFields?: string[];
};

export type ToUriSchema = {
  required: boolean;
  title?: string;
  description?: string;
  defaultValue?: unknown;
};
