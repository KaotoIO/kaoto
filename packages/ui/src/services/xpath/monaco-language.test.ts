import { IFunctionDefinition } from '../../models/datamapper/mapping';
import { Types } from '../../models/datamapper/types';
import { buildFunctionCompletionItem, buildFunctionSignature, monacoXPathLanguageMetadata } from './monaco-language';

vi.mock('monaco-editor', () => ({
  languages: {
    CompletionItemKind: { Keyword: 17, Function: 1 },
    CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
  },
}));

const testRange = {
  startLineNumber: 1,
  endLineNumber: 1,
  startColumn: 1,
  endColumn: 5,
};

const concatFn: IFunctionDefinition = {
  name: 'concat',
  displayName: 'Concatenate',
  description: 'Concatenates strings.',
  returnType: Types.String,
  arguments: [
    {
      name: 'args',
      displayName: '$args',
      description: 'Arguments',
      type: Types.AnyAtomicType,
      minOccurs: 2,
      maxOccurs: Number.MAX_SAFE_INTEGER,
    },
  ],
};

const positionFn: IFunctionDefinition = {
  name: 'position',
  displayName: 'Position',
  description: 'Returns the context position.',
  returnType: Types.Integer,
  arguments: [],
};

const tokenizeFn: IFunctionDefinition = {
  name: 'tokenize',
  displayName: 'Tokenize',
  description: 'Returns a sequence of strings.',
  returnType: Types.String,
  returnCollection: true,
  arguments: [
    {
      name: 'input',
      displayName: '$input',
      description: 'Input',
      type: Types.String,
      minOccurs: 1,
      maxOccurs: 1,
    },
    {
      name: 'pattern',
      displayName: '$pattern',
      description: 'Pattern',
      type: Types.String,
      minOccurs: 1,
      maxOccurs: 1,
    },
  ],
};

function createMockModel(wordAtPosition: { word: string; startColumn: number; endColumn: number } | null) {
  return {
    getWordAtPosition: () => wordAtPosition,
    getWordUntilPosition: () => wordAtPosition ?? { word: '', startColumn: 1, endColumn: 1 },
  };
}

describe('monaco-language', () => {
  describe('buildFunctionSignature()', () => {
    it('should build signature for function with required arguments', () => {
      expect(buildFunctionSignature(concatFn)).toBe('(args: anyAtomicType, ...): string');
    });

    it('should build signature for function with no arguments', () => {
      expect(buildFunctionSignature(positionFn)).toBe('(): integer');
    });

    it('should build signature for function with optional arguments', () => {
      const fn: IFunctionDefinition = {
        name: 'string-length',
        displayName: 'String Length',
        description: 'Returns the length.',
        returnType: Types.Integer,
        arguments: [
          {
            name: 'arg',
            displayName: '$arg',
            description: 'Argument',
            type: Types.String,
            minOccurs: 0,
            maxOccurs: 1,
          },
        ],
      };
      expect(buildFunctionSignature(fn)).toBe('(arg?: string): integer');
    });

    it('should build signature for function with mixed required and optional arguments', () => {
      const fn: IFunctionDefinition = {
        name: 'substring',
        displayName: 'Substring',
        description: 'Returns a substring.',
        returnType: Types.String,
        arguments: [
          {
            name: 'sourceString',
            displayName: '$sourceString',
            description: 'Source',
            type: Types.String,
            minOccurs: 1,
            maxOccurs: 1,
          },
          {
            name: 'startingLoc',
            displayName: '$startingLoc',
            description: 'Start',
            type: Types.Double,
            minOccurs: 1,
            maxOccurs: 1,
          },
          {
            name: 'length',
            displayName: '$length',
            description: 'Length',
            type: Types.Double,
            minOccurs: 0,
            maxOccurs: 1,
          },
        ],
      };
      expect(buildFunctionSignature(fn)).toBe('(sourceString: string, startingLoc: double, length?: double): string');
    });

    it('should indicate collection return type', () => {
      expect(buildFunctionSignature(tokenizeFn)).toBe('(input: string, pattern: string): string[]');
    });
  });

  describe('buildFunctionCompletionItem()', () => {
    it('should create completion item for function with arguments', () => {
      const fn: IFunctionDefinition = {
        name: 'contains',
        displayName: 'Contains',
        description: 'Checks if string contains another.',
        returnType: Types.Boolean,
        arguments: [
          {
            name: 'arg1',
            displayName: '$arg1',
            description: 'First arg',
            type: Types.String,
            minOccurs: 1,
            maxOccurs: 1,
          },
          {
            name: 'arg2',
            displayName: '$arg2',
            description: 'Second arg',
            type: Types.String,
            minOccurs: 1,
            maxOccurs: 1,
          },
        ],
      };
      const item = buildFunctionCompletionItem(fn, testRange);
      expect(item.label).toBe('contains');
      expect(item.kind).toBe(1);
      expect(item.insertText).toBe('contains($1)');
      expect(item.insertTextRules).toBe(4);
      expect(item.detail).toBe('(arg1: string, arg2: string): boolean');
      expect(item.range).toBe(testRange);
    });

    it('should create completion item for zero-arg function', () => {
      const item = buildFunctionCompletionItem(positionFn, testRange);
      expect(item.label).toBe('position');
      expect(item.insertText).toBe('position()$0');
      expect(item.insertTextRules).toBe(4);
      expect(item.detail).toBe('(): integer');
    });

    it('should include documentation with description and arguments', () => {
      const fn: IFunctionDefinition = {
        name: 'upper-case',
        displayName: 'Uppercase',
        description: 'Returns the upper-cased value.',
        returnType: Types.String,
        arguments: [
          {
            name: 'arg',
            displayName: '$arg',
            description: 'Argument',
            type: Types.String,
            minOccurs: 1,
            maxOccurs: 1,
          },
        ],
      };
      const item = buildFunctionCompletionItem(fn, testRange);
      const doc = item.documentation as { value: string };
      expect(doc.value).toContain('**Uppercase**');
      expect(doc.value).toContain('Returns the upper-cased value.');
      expect(doc.value).toContain('`$arg`');
      expect(doc.value).toContain('**Returns:** string');
    });

    it('should mark optional arguments in documentation', () => {
      const fn: IFunctionDefinition = {
        name: 'normalize-space',
        displayName: 'Normalize Space',
        description: 'Normalizes whitespace.',
        returnType: Types.String,
        arguments: [
          {
            name: 'arg',
            displayName: '$arg',
            description: 'Argument',
            type: Types.String,
            minOccurs: 0,
            maxOccurs: 1,
          },
        ],
      };
      const item = buildFunctionCompletionItem(fn, testRange);
      const doc = item.documentation as { value: string };
      expect(doc.value).toContain('*(optional)*');
    });

    it('should mark variadic arguments in documentation', () => {
      const item = buildFunctionCompletionItem(concatFn, testRange);
      const doc = item.documentation as { value: string };
      expect(doc.value).toContain('*(variadic)*');
    });

    it('should show collection return type in detail and documentation', () => {
      const item = buildFunctionCompletionItem(tokenizeFn, testRange);
      expect(item.detail).toBe('(input: string, pattern: string): string[]');
      const doc = item.documentation as { value: string };
      expect(doc.value).toContain('**Returns:** string[]');
    });
  });

  describe('hoverProvider.provideHover()', () => {
    beforeEach(() => {
      monacoXPathLanguageMetadata.functionDefinitions = [concatFn, positionFn];
    });

    afterEach(() => {
      monacoXPathLanguageMetadata.functionDefinitions = [];
    });

    it('should return hover content for a known function', () => {
      const model = createMockModel({ word: 'concat', startColumn: 1, endColumn: 7 });
      const position = { lineNumber: 1, column: 3 };
      const result = monacoXPathLanguageMetadata.hoverProvider.provideHover(
        model as never,
        position as never,
        {} as never,
      );
      expect(result).not.toBeNull();
      const hover = result as { contents: { value: string }[]; range: object };
      expect(hover.contents).toHaveLength(2);
      expect(hover.contents[0].value).toContain('concat');
      expect(hover.contents[1].value).toContain('**Concatenate**');
      expect(hover.range).toEqual({
        startLineNumber: 1,
        endLineNumber: 1,
        startColumn: 1,
        endColumn: 7,
      });
    });

    it('should return null for an unknown word', () => {
      const model = createMockModel({ word: 'myVariable', startColumn: 1, endColumn: 11 });
      const position = { lineNumber: 1, column: 3 };
      const result = monacoXPathLanguageMetadata.hoverProvider.provideHover(
        model as never,
        position as never,
        {} as never,
      );
      expect(result).toBeNull();
    });

    it('should return null when no word at position', () => {
      const model = createMockModel(null);
      const position = { lineNumber: 1, column: 1 };
      const result = monacoXPathLanguageMetadata.hoverProvider.provideHover(
        model as never,
        position as never,
        {} as never,
      );
      expect(result).toBeNull();
    });
  });

  describe('completionItemProvider.provideCompletionItems()', () => {
    beforeEach(() => {
      monacoXPathLanguageMetadata.functionDefinitions = [concatFn, positionFn];
    });

    afterEach(() => {
      monacoXPathLanguageMetadata.functionDefinitions = [];
    });

    it('should return keyword and function suggestions', () => {
      const model = createMockModel({ word: 'co', startColumn: 1, endColumn: 3 });
      const position = { lineNumber: 1, column: 3 };
      const result = monacoXPathLanguageMetadata.completionItemProvider.provideCompletionItems(
        model as never,
        position as never,
        {} as never,
        {} as never,
      );
      const list = result as { suggestions: { label: string; kind: number }[] };
      const keywordLabels = list.suggestions.filter((s) => s.kind === 17).map((s) => s.label);
      const functionLabels = list.suggestions.filter((s) => s.kind === 1).map((s) => s.label);
      expect(keywordLabels).toContain('if');
      expect(keywordLabels).toContain('for');
      expect(functionLabels).toContain('concat');
      expect(functionLabels).toContain('position');
    });

    it('should set correct range from word position', () => {
      const model = createMockModel({ word: 'pos', startColumn: 5, endColumn: 8 });
      const position = { lineNumber: 2, column: 8 };
      const result = monacoXPathLanguageMetadata.completionItemProvider.provideCompletionItems(
        model as never,
        position as never,
        {} as never,
        {} as never,
      );
      const list = result as { suggestions: { range: object }[] };
      for (const suggestion of list.suggestions) {
        expect(suggestion.range).toEqual({
          startLineNumber: 2,
          endLineNumber: 2,
          startColumn: 5,
          endColumn: 8,
        });
      }
    });
  });
});
