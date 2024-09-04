import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export const xpathLanguageID = 'xpath';

type MonacoXPathLanguageMetadata = monaco.languages.ILanguageExtensionPoint & {
  languageConfiguration: monaco.languages.LanguageConfiguration;
  tokensProvider: monaco.languages.IMonarchLanguage;
  completionItemProvider: monaco.languages.CompletionItemProvider;
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

export const monacoXPathLanguageMetadata: MonacoXPathLanguageMetadata = {
  id: xpathLanguageID,
  languageConfiguration: {
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

  completionItemProvider: {
    provideCompletionItems: (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      _context: monaco.languages.CompletionContext,
      _token: monaco.CancellationToken,
    ): monaco.languages.ProviderResult<monaco.languages.CompletionList> => {
      const suggestions = [
        ...keywords.map((k) => {
          const word = model.getWordUntilPosition(position);
          const range: monaco.IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          return {
            label: k,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: k,
            range: range,
          };
        }),
      ];
      return { suggestions: suggestions };
    },
  },
};
