import { JSONSchema4 } from 'json-schema';

/** Provides JSON schemas for CustomMode canvas nodes. No catalog dependency. */
export class CustomModeSchemaService {
  /** Schema for the mode node form (all fields except customInstructions). */
  static getRootSchema(): JSONSchema4 {
    return {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          title: 'Slug',
          description: 'Machine identifier — kebab-case, unique within the file.',
        },
        name: {
          type: 'string',
          title: 'Name',
          description: 'Display name shown in the mode selector (may include emoji).',
        },
        description: {
          type: 'string',
          title: 'Description',
          description: 'One-liner shown in the orchestrator dropdown.',
        },
        roleDefinition: {
          type: 'string',
          title: 'Role Definition',
          description: 'Defines who this mode is — shown to the LLM as a system prompt prefix.',
          'x-component': 'textarea',
        } as JSONSchema4,
        whenToUse: {
          type: 'string',
          title: 'When to Use',
          description: 'Tells the orchestrator when to route to this mode.',
          'x-component': 'textarea',
        } as JSONSchema4,
        groups: {
          type: 'array',
          title: 'Tool Groups',
          description: 'Tool permission groups granted to this mode.',
          // TODO: tuple-groups epic — tuple form [name, {fileRegex}] not yet supported
          items: {
            type: 'string',
            enum: ['read', 'edit', 'command', 'mcp', 'subagent', 'skill', 'execute', 'todo'],
          },
        },
      },
      required: ['slug', 'name'],
    };
  }

  /**
   * Schema for a customInstructions child node.
   * Stub — Epic 7 fills in per-type schemas once node types are finalised.
   */
  static getNodeSchema(_nodeType: string): JSONSchema4 | undefined {
    // TODO: Epic 7 — fill in per-type schemas
    return undefined;
  }
}
