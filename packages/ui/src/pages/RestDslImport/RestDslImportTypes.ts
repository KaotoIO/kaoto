export type ImportLoadSource = 'uri' | 'file' | 'apicurio' | 'manual' | undefined;

export type ImportSourceOption = 'uri' | 'file' | 'apicurio';

export type SchemaLoadedResult = {
  schema: string;
  source: ImportLoadSource;
  sourceIdentifier: string;
};

/** What a completed import generated */
export type ImportedOutputs = {
  rest: boolean;
  routes: boolean;
};

export type ImportOperation = {
  operationId: string;
  method: string;
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
