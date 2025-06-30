import { CanvasFormTabsContext, SuggestionRegistryProvider } from '@kaoto/forms';
import {
  CanvasNode,
  CanvasSideBar,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeIconResolver,
  NodeIconType,
  VisibleFlowsProvider,
} from '@kaoto/kaoto/testing';
import { NodeShape } from '@patternfly/react-topology';
import { Meta, StoryFn } from '@storybook/react';

const selectedNode: CanvasNode = {
  id: 'tokenizer-1234',
  label: 'tokenizer',
  parentNode: undefined,
  shape: NodeShape.rect,
  type: 'node',
  data: {
    vizNode: {
      children: undefined,
      data: {
        label: 'tokenizer',
        path: 'sink',
        isPlaceholder: false,
        icon: NodeIconResolver.getIcon('tokenizer', NodeIconType.EIP),
      } as IVisualizationNodeData,
      id: 'tokenizer-1234',
      nextNode: undefined,
      parentNode: undefined,
      previousNode: undefined,
      label: 'test',
      getId: () => 'tokenizer-1234',
      getNodeTitle: () => 'Tokenizer',
      getOmitFormFields: () => [],
      getComponentSchema: () => {
        return {
          schema: {
            title: 'Specialized tokenizer for AI applications',
            description: 'Represents a Camel tokenizer for AI.',
            type: 'object',
            additionalProperties: false,
            properties: {
              id: {
                type: 'string',
                title: 'Id',
                description: 'Sets the id of this node',
                $comment: 'group:common',
              },
              description: {
                type: 'string',
                title: 'Description',
                description: 'Sets the description of this node',
                $comment: 'group:common',
              },
              disabled: {
                type: 'boolean',
                title: 'Disabled',
                description:
                  'Whether to disable this EIP from the route during build time. Once an EIP has been disabled then it cannot be enabled later at runtime.',
                $comment: 'group:advanced',
              },
              langChain4jCharacterTokenizer: {},
              langChain4jLineTokenizer: {},
              langChain4jParagraphTokenizer: {},
              langChain4jSentenceTokenizer: {},
              langChain4jWordTokenizer: {},
            },
            anyOf: [
              {
                oneOf: [
                  {
                    type: 'object',
                    required: ['langChain4jCharacterTokenizer'],
                    properties: {
                      langChain4jCharacterTokenizer: {
                        $ref: '#/definitions/org.apache.camel.model.tokenizer.LangChain4jCharacterTokenizerDefinition',
                      },
                    },
                  },
                  {
                    not: {
                      anyOf: [
                        {
                          required: ['langChain4jCharacterTokenizer'],
                        },
                        {
                          required: ['langChain4jLineTokenizer'],
                        },
                        {
                          required: ['langChain4jParagraphTokenizer'],
                        },
                        {
                          required: ['langChain4jSentenceTokenizer'],
                        },
                        {
                          required: ['langChain4jWordTokenizer'],
                        },
                      ],
                    },
                  },
                  {
                    type: 'object',
                    required: ['langChain4jLineTokenizer'],
                    properties: {
                      langChain4jLineTokenizer: {
                        $ref: '#/definitions/org.apache.camel.model.tokenizer.LangChain4jTokenizerDefinition',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['langChain4jParagraphTokenizer'],
                    properties: {
                      langChain4jParagraphTokenizer: {
                        $ref: '#/definitions/org.apache.camel.model.tokenizer.LangChain4jParagraphTokenizerDefinition',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['langChain4jSentenceTokenizer'],
                    properties: {
                      langChain4jSentenceTokenizer: {
                        $ref: '#/definitions/org.apache.camel.model.tokenizer.LangChain4jSentenceTokenizerDefinition',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['langChain4jWordTokenizer'],
                    properties: {
                      langChain4jWordTokenizer: {
                        $ref: '#/definitions/org.apache.camel.model.tokenizer.LangChain4jWordTokenizerDefinition',
                      },
                    },
                  },
                ],
              },
            ],
            definitions: {
              'org.apache.camel.model.tokenizer.LangChain4jCharacterTokenizerDefinition': {
                title: 'LangChain4J Tokenizer with character splitter',
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'The id of this node',
                    $comment: 'group:common',
                  },
                  tokenizerType: {
                    type: 'string',
                    title: 'Tokenizer Type',
                    description: 'Sets the tokenizer type',
                    enum: ['OPEN_AI', 'AZURE', 'QWEN'],
                    $comment: 'group:common',
                  },
                  maxTokens: {
                    type: 'number',
                    title: 'Max Tokens',
                    description: 'Sets the maximum number of tokens on each segment',
                    $comment: 'group:common',
                  },
                  maxOverlap: {
                    type: 'number',
                    title: 'Max Overlap',
                    description: 'Sets the maximum number of tokens that can overlap in each segment',
                    $comment: 'group:common',
                  },
                },
                required: ['maxOverlap', 'maxTokens', 'tokenizerType'],
              },
              'org.apache.camel.model.tokenizer.LangChain4jTokenizerDefinition': {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                  },
                  maxOverlap: {
                    type: 'number',
                  },
                  maxTokens: {
                    type: 'number',
                  },
                  tokenizerType: {
                    type: 'string',
                    enum: ['OPEN_AI', 'AZURE', 'QWEN'],
                  },
                },
                required: ['maxOverlap', 'maxTokens'],
              },
              'org.apache.camel.model.tokenizer.LangChain4jParagraphTokenizerDefinition': {
                title: 'LangChain4J Tokenizer with paragraph splitter',
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'The id of this node',
                    $comment: 'group:common',
                  },
                  tokenizerType: {
                    type: 'string',
                    title: 'Tokenizer Type',
                    description: 'Sets the tokenizer type',
                    enum: ['OPEN_AI', 'AZURE', 'QWEN'],
                    $comment: 'group:common',
                  },
                  maxTokens: {
                    type: 'number',
                    title: 'Max Tokens',
                    description: 'Sets the maximum number of tokens on each segment',
                    $comment: 'group:common',
                  },
                  maxOverlap: {
                    type: 'number',
                    title: 'Max Overlap',
                    description: 'Sets the maximum number of tokens that can overlap in each segment',
                    $comment: 'group:common',
                  },
                },
                required: ['maxOverlap', 'maxTokens', 'tokenizerType'],
              },
              'org.apache.camel.model.tokenizer.LangChain4jSentenceTokenizerDefinition': {
                title: 'LangChain4J Tokenizer with sentence splitter',
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'The id of this node',
                    $comment: 'group:common',
                  },
                  tokenizerType: {
                    type: 'string',
                    title: 'Tokenizer Type',
                    description: 'Sets the tokenizer type',
                    enum: ['OPEN_AI', 'AZURE', 'QWEN'],
                    $comment: 'group:common',
                  },
                  maxTokens: {
                    type: 'number',
                    title: 'Max Tokens',
                    description: 'Sets the maximum number of tokens on each segment',
                    $comment: 'group:common',
                  },
                  maxOverlap: {
                    type: 'number',
                    title: 'Max Overlap',
                    description: 'Sets the maximum number of tokens that can overlap in each segment',
                    $comment: 'group:common',
                  },
                },
                required: ['maxOverlap', 'maxTokens', 'tokenizerType'],
              },
              'org.apache.camel.model.tokenizer.LangChain4jWordTokenizerDefinition': {
                title: 'LangChain4J Tokenizer with word splitter',
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'The id of this node',
                    $comment: 'group:common',
                  },
                  tokenizerType: {
                    type: 'string',
                    title: 'Tokenizer Type',
                    description: 'Sets the tokenizer type',
                    enum: ['OPEN_AI', 'AZURE', 'QWEN'],
                    $comment: 'group:common',
                  },
                  maxTokens: {
                    type: 'number',
                    title: 'Max Tokens',
                    description: 'Sets the maximum number of tokens on each segment',
                    $comment: 'group:common',
                  },
                  maxOverlap: {
                    type: 'number',
                    title: 'Max Overlap',
                    description: 'Sets the maximum number of tokens that can overlap in each segment',
                    $comment: 'group:common',
                  },
                },
                required: ['maxOverlap', 'maxTokens', 'tokenizerType'],
              },
            },
            $schema: 'http://json-schema.org/draft-07/schema#',
          },
        };
      },
      updateModel: () => {},
      getBaseEntity: () => {},
    } as unknown as IVisualizationNode,
  },
};

export default {
  title: 'Canvas/Tokenizer',
  component: CanvasSideBar,
  decorators: [
    (Story: StoryFn) => (
      <SuggestionRegistryProvider>
        <Story />
      </SuggestionRegistryProvider>
    ),
  ],
} as Meta<typeof CanvasSideBar>;

const Template: StoryFn<typeof CanvasSideBar> = (args) => {
  return (
    <CanvasFormTabsContext.Provider
      value={{
        selectedTab: 'All',
        setSelectedTab: () => {},
      }}
    >
      <VisibleFlowsProvider>
        <CanvasSideBar {...args} onClose={() => {}} />
      </VisibleFlowsProvider>
    </CanvasFormTabsContext.Provider>
  );
};

export const TokenizerNode = Template.bind({});
TokenizerNode.args = {
  selectedNode,
};
