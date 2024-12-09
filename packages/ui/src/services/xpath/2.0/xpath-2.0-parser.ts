import { defaultParserErrorProvider, IParserConfig, ITokenConfig, TokenType } from 'chevrotain';
import { createToken as orgCreateToken, CstParser, Lexer } from 'chevrotain';
import { XPathParser, XPathParserResult } from '../xpath-parser';

const fragments: Record<string, RegExp> = {};
const f = fragments;

fragments['NameStartChar'] = /[a-zA-Z]|\\u2070-\\u218F|\\u2C00-\\u2FEF|\\u3001-\\uD7FF|\\uF900-\\uFDCF|\\uFDF0-\\uFFFD/;
fragments['NameChar'] = new RegExp(
  `(${f.NameStartChar.source})|-|_|\\.|\\d|\\u00B7|[\\u0300-\\u036F]|[\\u203F-\\u2040]`,
);
fragments['Name'] = new RegExp(`(${f.NameStartChar.source})(${f.NameChar.source})*`);
fragments['StringLiteral'] = /("(""|[^"])*")|('(''|[^'])*')/;
fragments['Digits'] = /[0-9]+/;
fragments['DecimalLiteral'] = /(\.[0-9]+)|([0-9]+\.[0-9]*)/;
fragments['DoubleLiteral'] = /((\.[0-9]+)|([0-9]+(\.[0-9]*)?))[eE][+-]?[0-9]+/;

const allTokens: TokenType[] = [];

function createToken(options: ITokenConfig) {
  const newToken = orgCreateToken(options);
  allTokens.push(newToken);
  return newToken;
}

createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

/* In order to refer NCName from keywords for longer_alt, declare earlier here, but push as a last one later */
const NCName = orgCreateToken({ name: 'NCName', pattern: fragments['Name'] });

const Comma = createToken({ name: 'Comma', pattern: /,/ });
const Return = createToken({ name: 'Returns', pattern: /return/, longer_alt: NCName });
const For = createToken({ name: 'For', pattern: /for/, longer_alt: NCName });
const Dollar = createToken({ name: 'Dollar', pattern: /\$/ });
const Intersect = createToken({ name: 'Intersect', pattern: /intersect/, longer_alt: NCName });
const Instance = createToken({ name: 'Instance', pattern: /instance/, longer_alt: NCName });
const In = createToken({ name: 'In', pattern: /in/, longer_alt: NCName });
const Some = createToken({ name: 'Some', pattern: /some/, longer_alt: NCName });
const Every = createToken({ name: 'Every', pattern: /every/, longer_alt: NCName });
const Satisfies = createToken({ name: 'Satisfies', pattern: /satisfies/, longer_alt: NCName });
const If = createToken({ name: 'If', pattern: /if/, longer_alt: NCName });
const Then = createToken({ name: 'Then', pattern: /then/, longer_alt: NCName });
const Else = createToken({ name: 'Else', pattern: /else/, longer_alt: NCName });
const LParen = createToken({ name: 'LParen', pattern: /\(/ });
const RParen = createToken({ name: 'RParen', pattern: /\)/ });
const Or = createToken({ name: 'Or', pattern: /or/, longer_alt: NCName });
const And = createToken({ name: 'And', pattern: /and/, longer_alt: NCName });
const To = createToken({ name: 'To', pattern: /to/, longer_alt: NCName });
const Plus = createToken({ name: 'Plus', pattern: /\+/ });
const Minus = createToken({ name: 'Minus', pattern: /-/ });
const Asterisk = createToken({ name: 'Asterisk', pattern: /\*/ });
const Div = createToken({ name: 'Div', pattern: /div/, longer_alt: NCName });
const Idiv = createToken({ name: 'Tdiv', pattern: /idiv/, longer_alt: NCName });
const Mod = createToken({ name: 'Mod', pattern: /mod/, longer_alt: NCName });
const Union = createToken({ name: 'Union', pattern: /union/, longer_alt: NCName });
const Pipe = createToken({ name: 'Pipe', pattern: /\|/ });
const Except = createToken({ name: 'Except', pattern: /except/, longer_alt: NCName });
const Of = createToken({ name: 'Of', pattern: /of/, longer_alt: NCName });
const Treat = createToken({ name: 'Treat', pattern: /treat/, longer_alt: NCName });
const Castable = createToken({ name: 'Castable', pattern: /castable/, longer_alt: NCName });
const As = createToken({ name: 'As', pattern: /as/, longer_alt: NCName });
const Cast = createToken({ name: 'Cast', pattern: /cast/, longer_alt: NCName });
const Equal = createToken({ name: 'Equal', pattern: /=/ });
const NotEqual = createToken({ name: 'NotEqual', pattern: /!=/ });
const Precede = createToken({ name: 'Precede', pattern: /<</ });
const LessThanEqual = createToken({ name: 'LessThanEqual', pattern: /<=/ });
const LessThan = createToken({ name: 'LessThan', pattern: /</ });
const Follow = createToken({ name: 'Precede', pattern: />>/ });
const GreaterThanEqual = createToken({ name: 'GreaterThanEqual', pattern: />=/ });
const GreaterThan = createToken({ name: 'GreaterThan', pattern: />/ });
const Eq = createToken({ name: 'Eq', pattern: /eq/, longer_alt: NCName });
const Ne = createToken({ name: 'Ne', pattern: /ne/, longer_alt: NCName });
const Lt = createToken({ name: 'Lt', pattern: /lt/, longer_alt: NCName });
const Le = createToken({ name: 'Le', pattern: /le/, longer_alt: NCName });
const Gt = createToken({ name: 'Gt', pattern: /gt/, longer_alt: NCName });
const Ge = createToken({ name: 'Ge', pattern: /ge/, longer_alt: NCName });
const Is = createToken({ name: 'Is', pattern: /is/, longer_alt: NCName });
const DoubleSlash = createToken({ name: 'DoubleSlash', pattern: /\/\// });
const Slash = createToken({ name: 'Slash', pattern: /\// });
const DoubleColon = createToken({ name: 'DoubleColon', pattern: /::/ });
const Colon = createToken({ name: 'Colon', pattern: /:/ });
const Child = createToken({ name: 'Child', pattern: /child/, longer_alt: NCName });
const DescendantOrSelf = createToken({ name: 'DescendantOrSelf', pattern: /descendant-or-self/, longer_alt: NCName });
const Descendant = createToken({ name: 'Descendant', pattern: /descendant/, longer_alt: NCName });
const Attribute = createToken({ name: 'Attribute', pattern: /attribute/, longer_alt: NCName });
const Self = createToken({ name: 'Self', pattern: /self/, longer_alt: NCName });
const FollowingSibling = createToken({ name: 'FollowingSibling', pattern: /following-sibling/, longer_alt: NCName });
const Following = createToken({ name: 'Following', pattern: /followed-sibling/, longer_alt: NCName });
const Namespace = createToken({ name: 'Namespace', pattern: /namespace/, longer_alt: NCName });
const Parent = createToken({ name: 'Parent', pattern: /parent/, longer_alt: NCName });
const AncestorOrSelf = createToken({ name: 'AncestorOrSelf', pattern: /ancestor-or-self/, longer_alt: NCName });
const Ancestor = createToken({ name: 'Ancestor', pattern: /ancestor/, longer_alt: NCName });
const PrecedingSibling = createToken({ name: 'PrecedingSibling', pattern: /preceding-sibling/, longer_alt: NCName });
const Preceding = createToken({ name: 'Preceding', pattern: /preceding/, longer_alt: NCName });
const ContextItemExpr = createToken({ name: 'ContextItemExpr', pattern: /\./ });
const AbbrevReverseStep = createToken({ name: 'AbbrevReverseStep', pattern: /\.\./ });
const At = createToken({ name: 'At', pattern: /@/ });
const LSquare = createToken({ name: 'LSquare', pattern: /\[/ });
const RSquare = createToken({ name: 'RSquare', pattern: /]/ });
const Question = createToken({ name: 'Question', pattern: /\?/ });
const Item = createToken({ name: 'Item', pattern: /item/, longer_alt: NCName });
const Node = createToken({ name: 'Node', pattern: /node/, longer_alt: NCName });
const DocumentNode = createToken({ name: 'DocumentNode', pattern: /document-node/, longer_alt: NCName });
const Text = createToken({ name: 'Text', pattern: /text/, longer_alt: NCName });
const Comment = createToken({ name: 'Comment', pattern: /comment/, longer_alt: NCName });
const ProcessingInstruction = createToken({
  name: 'ProcessingInstruction',
  pattern: /processing-instruction/,
  longer_alt: NCName,
});
const SchemaAttribute = createToken({ name: 'SchemaAttribute', pattern: /schema-attribute/, longer_alt: NCName });
const Element = createToken({ name: 'Element', pattern: /element/, longer_alt: NCName });
const SchemaElement = createToken({ name: 'SchemaElement', pattern: /schema-element/, longer_alt: NCName });
const EmptySequence = createToken({ name: 'EmptySequence', pattern: /empty-sequence/, longer_alt: NCName });

const StringLiteral = createToken({ name: 'StringLiteral', pattern: fragments['StringLiteral'] });
const IntegerLiteral = createToken({ name: 'IntegerLiteral', pattern: fragments['Digits'] });
const DecimalLiteral = createToken({ name: 'DecimalLiteral', pattern: fragments['DecimalLiteral'] });
const DoubleLiteral = createToken({ name: 'DoubleLiteral', pattern: fragments['DoubleLiteral'] });

/** DO NOT CHANGE @see {@link NCName} */
allTokens.push(NCName);

/**
 * XPath 2.0 Parser which implements the EBNF defined in the W3C specification
 * - https://www.w3.org/TR/xpath20/#id-grammar
 */
export class XPath2Parser extends CstParser implements XPathParser {
  static lexer = new Lexer(allTokens);

  constructor() {
    super(allTokens, {
      recoveryEnabled: false,
      maxLookahead: 5,
      dynamicTokensEnabled: false,
      outputCst: true,
      errorMessageProvider: defaultParserErrorProvider,
      nodeLocationTracking: 'none',
      traceInitPerf: false,
      skipValidations: false,
    } as IParserConfig & { outputCst: boolean });
    this.performSelfAnalysis();
  }

  parseXPath(xpath: string): XPathParserResult {
    const lexResult = XPath2Parser.lexer.tokenize(xpath);
    this.input = lexResult.tokens;
    const cst = this.Expr();

    return {
      cst: cst,
      lexErrors: lexResult.errors,
      parseErrors: this.errors,
    };
  }

  private Expr = this.RULE('Expr', () => {
    this.SUBRULE(this.ExprSingle);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.ExprSingle);
    });
  });

  private ExprSingle = this.RULE('ExprSingle', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.ForExpr) },
      { ALT: () => this.SUBRULE(this.QuantifiedExpr) },
      { ALT: () => this.SUBRULE(this.IfExpr) },
      { ALT: () => this.SUBRULE(this.OrExpr) },
    ]);
  });

  private ForExpr = this.RULE('ForExpr', () => {
    this.CONSUME(For);
    this.SUBRULE(this.VarRef);
    this.CONSUME(In);
    this.SUBRULE(this.ExprSingle);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.VarRef);
      this.CONSUME2(In);
      this.SUBRULE2(this.ExprSingle);
    });
    this.CONSUME(Return);
    this.SUBRULE3(this.ExprSingle);
  });

  private QuantifiedExpr = this.RULE('QuantifiedExpr', () => {
    this.OR([{ ALT: () => this.CONSUME(Some) }, { ALT: () => this.CONSUME(Every) }]);
    this.SUBRULE(this.VarRef);
    this.CONSUME(In);
    this.SUBRULE(this.ExprSingle);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.VarRef);
      this.CONSUME2(In);
      this.SUBRULE2(this.ExprSingle);
    });
    this.CONSUME(Satisfies);
    this.SUBRULE3(this.ExprSingle);
  });

  private IfExpr = this.RULE('IfExpr', () => {
    this.CONSUME(If);
    this.CONSUME(LParen);
    this.SUBRULE(this.Expr);
    this.CONSUME(RParen);
    this.CONSUME(Then);
    this.SUBRULE(this.ExprSingle);
    this.CONSUME(Else);
    this.SUBRULE2(this.ExprSingle);
  });

  private OrExpr = this.RULE('OrExpr', () => {
    this.SUBRULE(this.AndExpr);
    this.MANY(() => {
      this.CONSUME(Or);
      this.SUBRULE2(this.AndExpr);
    });
  });

  private AndExpr = this.RULE('AndExpr', () => {
    this.SUBRULE(this.ComparisonExpr);
    this.MANY(() => {
      this.CONSUME(And);
      this.SUBRULE2(this.ComparisonExpr);
    });
  });

  private ComparisonExpr = this.RULE('ComparisonExpr', () => {
    this.SUBRULE(this.RangeExpr);
    this.OPTION(() => {
      this.OR([
        // ValueComp
        { ALT: () => this.CONSUME(Eq) },
        { ALT: () => this.CONSUME(Ne) },
        { ALT: () => this.CONSUME(Lt) },
        { ALT: () => this.CONSUME(Le) },
        { ALT: () => this.CONSUME(Gt) },
        { ALT: () => this.CONSUME(Ge) },
        // GeneralComp
        { ALT: () => this.CONSUME(Equal) },
        { ALT: () => this.CONSUME(NotEqual) },
        { ALT: () => this.CONSUME(LessThan) },
        { ALT: () => this.CONSUME(LessThanEqual) },
        { ALT: () => this.CONSUME(GreaterThan) },
        { ALT: () => this.CONSUME(GreaterThanEqual) },
        // NodeComp
        { ALT: () => this.CONSUME(Is) },
        { ALT: () => this.CONSUME2(Precede) },
        { ALT: () => this.CONSUME(Follow) },
        { ALT: () => this.SUBRULE2(this.RangeExpr) },
      ]);
    });
  });

  private RangeExpr = this.RULE('RangeExpr', () => {
    this.SUBRULE(this.AdditiveExpr);
    this.OPTION(() => {
      this.CONSUME(To);
      this.SUBRULE2(this.AdditiveExpr);
    });
  });

  private AdditiveExpr = this.RULE('AdditiveExpr', () => {
    this.SUBRULE(this.MultiplicativeExpr);
    this.MANY(() => {
      this.OR([{ ALT: () => this.CONSUME(Plus) }, { ALT: () => this.CONSUME(Minus) }]);
      this.SUBRULE2(this.MultiplicativeExpr);
    });
  });

  private MultiplicativeExpr = this.RULE('MultiplicativeExpr', () => {
    this.SUBRULE(this.UnionExpr);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Asterisk) },
        { ALT: () => this.CONSUME(Div) },
        { ALT: () => this.CONSUME(Idiv) },
        { ALT: () => this.CONSUME(Mod) },
      ]);
      this.SUBRULE2(this.UnionExpr);
    });
  });

  private UnionExpr = this.RULE('UnionExpr', () => {
    this.SUBRULE(this.IntersectExceptExpr);
    this.MANY(() => {
      this.OR([{ ALT: () => this.CONSUME(Union) }, { ALT: () => this.CONSUME(Pipe) }]);
      this.SUBRULE2(this.IntersectExceptExpr);
    });
  });

  private IntersectExceptExpr = this.RULE('IntersectExceptExpr', () => {
    this.SUBRULE(this.InstanceofExpr);
    this.MANY(() => {
      this.OR([{ ALT: () => this.CONSUME(Intersect) }, { ALT: () => this.CONSUME(Except) }]);
      this.SUBRULE2(this.InstanceofExpr);
    });
  });

  private InstanceofExpr = this.RULE('InstanceofExpr', () => {
    // CastExpr
    this.MANY(() => {
      this.OR([{ ALT: () => this.CONSUME(Minus) }, { ALT: () => this.CONSUME(Plus) }]);
    });
    this.SUBRULE(this.PathExpr);
    this.OPTION(() => {
      this.CONSUME(Cast);
      this.CONSUME(As);
      this.SUBRULE(this.SingleType);
    });
    // CastableExpr
    this.OPTION2(() => {
      this.CONSUME(Castable);
      this.CONSUME2(As);
      this.SUBRULE2(this.SingleType);
    });
    // TreatExpr
    this.OPTION3(() => {
      this.CONSUME(Treat);
      this.CONSUME3(As);
      this.SUBRULE3(this.SequenceType);
    });
    // InstanceofExpr
    this.OPTION4(() => {
      this.CONSUME(Instance);
      this.CONSUME(Of);
      this.SUBRULE4(this.SequenceType);
    });
  });

  private PathExpr = this.RULE('PathExpr', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Slash);
          this.OPTION(() => this.SUBRULE(this.RelativePathExpr));
        },
      },
      {
        ALT: () => {
          this.CONSUME(DoubleSlash);
          this.SUBRULE2(this.RelativePathExpr);
        },
      },
      { ALT: () => this.SUBRULE3(this.RelativePathExpr) },
    ]);
  });

  private ChildPathSegmentExpr = this.RULE('ChildPathSegmentExpr', () => {
    this.OR([{ ALT: () => this.CONSUME(Slash) }, { ALT: () => this.CONSUME(DoubleSlash) }]);
    this.SUBRULE2(this.StepExpr);
  });

  private RelativePathExpr = this.RULE('RelativePathExpr', () => {
    this.SUBRULE(this.StepExpr);
    this.MANY(() => this.SUBRULE2(this.ChildPathSegmentExpr));
    this.OPTION(() => this.CONSUME(Slash));
  });

  private StepExpr = this.RULE('StepExpr', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.FilterExpr) },
      {
        ALT: () => {
          this.OR2([
            { ALT: () => this.SUBRULE(this.ReverseStep) },
            {
              ALT: () => {
                // ForwardStep
                this.OR3([
                  {
                    ALT: () => {
                      // ForwardAxis
                      this.OR4([
                        {
                          ALT: () => {
                            this.CONSUME(Child);
                            this.CONSUME(DoubleColon);
                          },
                        },
                        {
                          ALT: () => {
                            this.CONSUME(Descendant);
                            this.CONSUME2(DoubleColon);
                          },
                        },
                        {
                          ALT: () => {
                            this.CONSUME(Attribute);
                            this.CONSUME3(DoubleColon);
                          },
                        },
                        {
                          ALT: () => {
                            this.CONSUME(Self);
                            this.CONSUME4(DoubleColon);
                          },
                        },
                        {
                          ALT: () => {
                            this.CONSUME(DescendantOrSelf);
                            this.CONSUME5(DoubleColon);
                          },
                        },
                        {
                          ALT: () => {
                            this.CONSUME(FollowingSibling);
                            this.CONSUME6(DoubleColon);
                          },
                        },
                        {
                          ALT: () => {
                            this.CONSUME(Following);
                            this.CONSUME7(DoubleColon);
                          },
                        },
                        {
                          ALT: () => {
                            this.CONSUME(Namespace);
                            this.CONSUME8(DoubleColon);
                          },
                        },
                      ]);
                      this.SUBRULE(this.NodeTest);
                    },
                  },
                  {
                    ALT: () => {
                      this.OPTION(() => this.CONSUME(At));
                      this.SUBRULE2(this.NodeTest);
                    },
                  },
                ]);
              },
            },
          ]);
          this.SUBRULE(this.PredicateList);
        },
      },
    ]);
  });

  private ReverseStep = this.RULE('ReverseStep', () => {
    this.OR([
      {
        ALT: () => {
          this.SUBRULE(this.ReverseAxis);
          this.SUBRULE(this.NodeTest);
        },
      },
      { ALT: () => this.CONSUME(AbbrevReverseStep) },
    ]);
  });

  private ReverseAxis = this.RULE('ReverseAxis', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Parent);
          this.CONSUME(DoubleColon);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Ancestor);
          this.CONSUME2(DoubleColon);
        },
      },
      {
        ALT: () => {
          this.CONSUME(PrecedingSibling);
          this.CONSUME3(DoubleColon);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Preceding);
          this.CONSUME4(DoubleColon);
        },
      },
      {
        ALT: () => {
          this.CONSUME(AncestorOrSelf);
          this.CONSUME5(DoubleColon);
        },
      },
    ]);
  });

  private NodeTest = this.RULE('NodeTest', () => {
    this.OR([{ ALT: () => this.SUBRULE(this.KindTest) }, { ALT: () => this.SUBRULE(this.NameTest) }]);
  });

  private NameTest = this.RULE('NameTest', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(NCName);
          this.OPTION(() => {
            this.CONSUME(Colon);
            this.OR2([{ ALT: () => this.CONSUME(Asterisk) }, { ALT: () => this.CONSUME2(NCName) }]);
          });
        },
      },
      {
        ALT: () => {
          this.CONSUME2(Asterisk);
          this.OPTION2(() => {
            this.CONSUME2(Colon);
            this.CONSUME3(NCName);
          });
        },
      },
    ]);
  });

  private FilterExpr = this.RULE('FilterExpr', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.Literal) },
      { ALT: () => this.SUBRULE(this.VarRef) },
      { ALT: () => this.SUBRULE(this.ParenthesizedExpr) },
      { ALT: () => this.CONSUME(ContextItemExpr) },
      { ALT: () => this.SUBRULE(this.FunctionCall) },
    ]);
    this.SUBRULE(this.PredicateList);
  });

  private PredicateList = this.RULE('PredicateList', () => {
    this.MANY(() => {
      this.CONSUME(LSquare);
      this.SUBRULE(this.Expr);
      this.CONSUME(RSquare);
    });
  });

  private Literal = this.RULE('Literal', () => {
    this.OR([{ ALT: () => this.SUBRULE(this.NumericLiteral) }, { ALT: () => this.CONSUME(StringLiteral) }]);
  });

  private NumericLiteral = this.RULE('NumericLiteral', () => {
    this.OR([
      { ALT: () => this.CONSUME(IntegerLiteral) },
      { ALT: () => this.CONSUME(DecimalLiteral) },
      { ALT: () => this.CONSUME(DoubleLiteral) },
    ]);
  });

  private VarRef = this.RULE('VarRef', () => {
    this.CONSUME(Dollar);
    this.SUBRULE(this.QName);
  });

  private ParenthesizedExpr = this.RULE('ParenthesizedExpr', () => {
    this.CONSUME(LParen);
    this.OPTION(() => this.SUBRULE(this.Expr));
    this.CONSUME(RParen);
  });

  private FunctionCall = this.RULE('FunctionCall', () => {
    this.SUBRULE(this.QName);
    this.CONSUME(LParen);
    this.OPTION(() => {
      this.SUBRULE(this.ExprSingle);
      this.MANY(() => {
        this.CONSUME(Comma);
        this.SUBRULE2(this.ExprSingle);
      });
    });
    this.CONSUME(RParen);
  });

  private SingleType = this.RULE('SingleType', () => {
    this.SUBRULE(this.QName);
    this.OPTION(() => this.CONSUME(Question));
  });

  private SequenceType = this.RULE('SequenceType', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(EmptySequence);
          this.CONSUME(LParen);
          this.CONSUME(RParen);
        },
      },
      {
        ALT: () => {
          this.SUBRULE(this.ItemType);
          this.OPTION(() => this.SUBRULE(this.OccurrenceIndicator));
        },
      },
    ]);
  });

  private OccurrenceIndicator = this.RULE('OccurrenceIndicator', () => {
    this.OR([
      { ALT: () => this.CONSUME(Question) },
      { ALT: () => this.CONSUME(Asterisk) },
      { ALT: () => this.CONSUME(Plus) },
    ]);
  });

  private ItemType = this.RULE('ItemType', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.KindTest) },
      {
        ALT: () => {
          this.CONSUME(Item);
          this.CONSUME(LParen);
          this.CONSUME(RParen);
        },
      },
      { ALT: () => this.SUBRULE(this.QName) },
    ]);
  });

  private KindTest = this.RULE('KindTest', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.DocumentTest) },
      { ALT: () => this.SUBRULE(this.ElementTest) },
      { ALT: () => this.SUBRULE(this.AttributeTest) },
      { ALT: () => this.SUBRULE(this.SchemaElementTest) },
      { ALT: () => this.SUBRULE(this.SchemaAttributeTest) },
      { ALT: () => this.SUBRULE(this.PITest) },
      { ALT: () => this.SUBRULE(this.CommentTest) },
      { ALT: () => this.SUBRULE(this.TextTest) },
      { ALT: () => this.SUBRULE(this.AnyKindTest) },
    ]);
  });

  private AnyKindTest = this.RULE('AnyKindTest', () => {
    this.CONSUME(Node);
    this.CONSUME(LParen);
    this.CONSUME(RParen);
  });

  private DocumentTest = this.RULE('DocumentTest', () => {
    this.CONSUME(DocumentNode);
    this.CONSUME(LParen);
    this.OPTION(() => {
      this.OR([{ ALT: () => this.SUBRULE(this.ElementTest) }, { ALT: () => this.SUBRULE(this.SchemaElementTest) }]);
    });
    this.CONSUME(RParen);
  });

  private TextTest = this.RULE('TextTest', () => {
    this.CONSUME(Text);
    this.CONSUME(LParen);
    this.CONSUME(RParen);
  });

  private CommentTest = this.RULE('CommentTest', () => {
    this.CONSUME(Comment);
    this.CONSUME(LParen);
    this.CONSUME(RParen);
  });

  private PITest = this.RULE('PITest', () => {
    this.CONSUME(ProcessingInstruction);
    this.CONSUME(LParen);
    this.OPTION(() => {
      this.OR([{ ALT: () => this.CONSUME(NCName) }, { ALT: () => this.CONSUME(StringLiteral) }]);
    });
    this.CONSUME(RParen);
  });

  private AttributeTest = this.RULE('AttributeTest', () => {
    this.CONSUME(Attribute);
    this.CONSUME(LParen);
    this.OPTION(() => {
      this.SUBRULE(this.AttribNameOrWildcard);
      this.OPTION2(() => {
        this.CONSUME(Comma);
        this.SUBRULE(this.QName);
      });
    });
    this.CONSUME(RParen);
  });

  private AttribNameOrWildcard = this.RULE('AttribNameOrWildcard', () => {
    this.OR([{ ALT: () => this.SUBRULE(this.QName) }, { ALT: () => this.CONSUME(Asterisk) }]);
  });

  private SchemaAttributeTest = this.RULE('SchemaAttributeTest', () => {
    this.CONSUME(SchemaAttribute);
    this.CONSUME(LParen);
    this.SUBRULE(this.QName);
    this.CONSUME(RParen);
  });

  private ElementTest = this.RULE('ElementTest', () => {
    this.CONSUME(Element);
    this.CONSUME(LParen);
    this.OPTION(() => {
      this.SUBRULE(this.ElementNameOrWildcard);
      this.OPTION2(() => {
        this.CONSUME(Comma);
        this.SUBRULE(this.QName);
        this.OPTION3(() => this.CONSUME(Question));
      });
    });
    this.CONSUME(RParen);
  });

  private ElementNameOrWildcard = this.RULE('ElementNameOrWildcard', () => {
    this.OR([{ ALT: () => this.SUBRULE(this.QName) }, { ALT: () => this.CONSUME(Asterisk) }]);
  });

  private SchemaElementTest = this.RULE('SchemaElementTest', () => {
    this.CONSUME(SchemaElement);
    this.CONSUME(LParen);
    this.SUBRULE(this.QName);
    this.CONSUME(RParen);
  });

  private QName = this.RULE('QName', () => {
    this.OPTION(() => {
      this.CONSUME(NCName);
      this.CONSUME(Colon);
    });
    this.CONSUME2(NCName);
  });
}
