// Properties which are common for components (in .properties, .headers, .componentProperties) and processors (in .properties)
export interface CamelPropertyCommon {
    index: number;
    kind: string;
    displayName: string;
    label?: string;
    required: boolean;
    javaType: string;
    enum?: string[];
    autowired: boolean;
    defaultValue?: string;
    deprecated: boolean;
    secret: boolean;
    description: string;
}
