import * as monaco from 'monaco-editor';

import { IFunctionArgumentDefinition, IFunctionDefinition } from '../../models/datamapper/mapping';

export const xpathLanguageID = 'xpath';

type MonacoXPathLanguageMetadata = monaco.languages.ILanguageExtensionPoint & {
  languageConfiguration: monaco.languages.LanguageConfiguration;
  tokensProvider: monaco.languages.IMonarchLanguage;
  completionItemProvider: monaco.languages.CompletionItemProvider;
  hoverProvider: monaco.languages.HoverProvider;
  functionDefinitions: IFunctionDefinition[];
};

const keywords = [
  'if',
  'for',
  'idiv',
  'div',
  'mod',
  'eq',
  'ne',
  'gt',
  'lt',
  'ge',
  'le',
  'is',
  'union',
  'intersect',
  'except',
  'to',
];

const operators = ['+', '-', '*', '<<', '>>', '|', ','];

function formatReturnType(fn: IFunctionDefinition): string {
  return fn.returnCollection ? `${fn.returnType}[]` : `${fn.returnType}`;
}

export function buildFunctionSignature(fn: IFunctionDefinition): string {
  const params = fn.arguments.map((arg) => formatArgument(arg)).join(', ');
  return `(${params}): ${formatReturnType(fn)}`;
}

function formatArgument(arg: IFunctionArgumentDefinition): string {
  const optional = arg.minOccurs === 0 ? '?' : '';
  const variadic = arg.maxOccurs > 1 ? ', ...' : '';
  return `${arg.name}${optional}: ${arg.type}${variadic}`;
}

function buildDocumentation(fn: IFunctionDefinition): monaco.IMarkdownString {
  const lines: string[] = [`**${fn.displayName}**`, '', fn.description];
  if (fn.arguments.length > 0) {
    lines.push('', '**Arguments:**');
    for (const arg of fn.arguments) {
      const optional = arg.minOccurs === 0 ? ' *(optional)*' : '';
      const variadic = arg.maxOccurs > 1 ? ' *(variadic)*' : '';
      lines.push(`- \`${arg.displayName}\`: ${arg.type}${optional}${variadic}`);
    }
  }
  lines.push('', `**Returns:** ${formatReturnType(fn)}`);
  return { value: lines.join('\n') };
}

export function buildFunctionCompletionItem(
  fn: IFunctionDefinition,
  range: monaco.IRange,
): monaco.languages.CompletionItem {
  const hasArgs = fn.arguments.length > 0;
  return {
    label: fn.name,
    kind: monaco.languages.CompletionItemKind.Function,
    detail: buildFunctionSignature(fn),
    documentation: buildDocumentation(fn),
    insertText: hasArgs ? `${fn.name}($1)` : `${fn.name}()$0`,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range: range,
  };
}

function buildFunctionHoverContent(fn: IFunctionDefinition): monaco.IMarkdownString[] {
  const signature = `\`${fn.name}${buildFunctionSignature(fn)}\``;
  const doc = buildDocumentation(fn);
  return [{ value: signature }, doc];
}

export const monacoXPathLanguageMetadata: MonacoXPathLanguageMetadata = {
  id: xpathLanguageID,
  languageConfiguration: {
    wordPattern: /\d[\w.]*|[a-zA-Z_][\w-]*/,
    brackets: [
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '[', close: ']' },
      { open: '(', close: ')' },
    ],
  },
  tokensProvider: {
    keywords: keywords,
    operators: operators,
    tokenizer: {
      root: [],
    },
  },

  functionDefinitions: [],

  hoverProvider: {
    provideHover: (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
    ): monaco.languages.ProviderResult<monaco.languages.Hover> => {
      const wordInfo = model.getWordAtPosition(position);
      if (!wordInfo) return null;
      const fn = monacoXPathLanguageMetadata.functionDefinitions.find((f) => f.name === wordInfo.word);
      if (!fn) return null;
      return {
        contents: buildFunctionHoverContent(fn),
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endColumn: wordInfo.endColumn,
        },
      };
    },
  },

  completionItemProvider: {
    provideCompletionItems: (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      _context: monaco.languages.CompletionContext,
      _token: monaco.CancellationToken,
    ): monaco.languages.ProviderResult<monaco.languages.CompletionList> => {
      const word = model.getWordUntilPosition(position);
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const suggestions: monaco.languages.CompletionItem[] = [
        ...keywords.map((k) => ({
          label: k,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: k,
          range: range,
        })),
        ...monacoXPathLanguageMetadata.functionDefinitions.map((fn) => buildFunctionCompletionItem(fn, range)),
      ];
      return { suggestions };
    },
  },
};
