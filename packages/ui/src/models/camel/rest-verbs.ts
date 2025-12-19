import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

export const REST_ELEMENT_NAME = 'rest' as keyof ProcessorDefinition;

export const REST_DSL_VERBS = ['get', 'post', 'put', 'delete', 'patch', 'head'];
