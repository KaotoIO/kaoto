export const enum FileTypes {
  Kamelets = 'kamelets',
}

export interface FileTypesResponse {
  filename: string;
  content: string;
}
