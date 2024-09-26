import { HTMLFieldProps } from 'uniforms';

export interface PlaceholderState {
  isObject: boolean;
  parentNodeId: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IPropertiesField extends HTMLFieldProps<any, HTMLDivElement> {
  [key: string]: unknown;
}
