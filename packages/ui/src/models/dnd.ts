export interface IDragAndDropField {
  type: 'source' | 'target' | 'mapping';
  id: string;
  name: string;
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  payload?: any; // TODO: I hate this
}
