export interface ITile<T = unknown> {
  type: string;
  name: string;
  title: string;
  description: string;
  headerTags?: string[];
  tags: string[];
  rawObject: T;
}
