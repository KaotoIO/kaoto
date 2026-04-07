// Properties which are common for components (in .properties, .headers, .componentProperties) and processors (in .properties)
export interface CamelPropertyCommon {
  index: number;
  kind: string;
  displayName: string;
  label?: string;
  required: boolean;
  multiValue?: boolean;
  prefix?: string;
  javaType: string;
  enum?: string[];
  autowired: boolean;
  defaultValue?: string | boolean | number;
  deprecated: boolean;
  deprecationNote?: string;
  secret: boolean;
  description: string;
}
