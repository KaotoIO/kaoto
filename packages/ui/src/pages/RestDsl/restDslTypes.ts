import { REST_DSL_VERBS } from '../../models/special-processors.constants';

export type RestVerb = (typeof REST_DSL_VERBS)[number];

export type ImportLoadSource = 'uri' | 'file' | 'apicurio' | 'manual' | undefined;

export type RestEditorSelection =
  | { kind: 'restConfiguration' }
  | { kind: 'rest'; restId: string }
  | { kind: 'operation'; restId: string; verb: RestVerb; index: number };

export type ImportSourceOption = 'uri' | 'file' | 'apicurio';

export type ImportOperation = {
  operationId: string;
  method: RestVerb;
  path: string;
  description?: string;
  consumes?: string;
  produces?: string;
  param?: Record<string, unknown>[];
  responseMessage?: Record<string, unknown>[];
  security?: Record<string, unknown>[];
  deprecated?: boolean;
  selected: boolean;
  routeExists: boolean;
};

export type ApicurioArtifact = {
  id: string;
  name: string;
  type: string;
};

export type ApicurioArtifactSearchResult = {
  artifacts: ApicurioArtifact[];
};

export type FormEntity = {
  getNodeSchema: (path: string) => unknown;
  getNodeDefinition: (path: string) => unknown;
  getRootPath: () => string;
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
