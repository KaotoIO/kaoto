export const enum FileTypes {
  Kamelets = 'kamelets',
  CitrusTemplates = 'citrus-templates',
}

export interface FileTypesResponse {
  filename: string;
  content: string;
}
