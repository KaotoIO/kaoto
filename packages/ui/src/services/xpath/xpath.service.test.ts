import { PathExpression, PathSegment } from '../../models/datamapper';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
} from '../../models/datamapper/document';
import { Predicate, PredicateOperator } from '../../models/datamapper/xpath';
import { cartXsd, shipOrderXsd } from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocumentService } from '../xml-schema-document.service';
import { LiteralNode, XPathNodeType } from './syntaxtree/xpath-syntaxtree-model';
import { XPathUtil } from './syntaxtree/xpath-syntaxtree-util';
import { XPathService } from './xpath.service';

describe('XPathService', () => {
  describe('parse()', () => {
    it('should parse a field path', () => {
      const result = XPathService.parse('/aaa/bbb/ccc');
      expect(result.cst).toBeDefined();
      expect(result.exprNode).toBeDefined();
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
    });

    it('should parse a field which contains a reserved word in its spelling', () => {
      let result = XPathService.parse('/shiporder/orderperson');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
      expect(result.exprNode).toBeDefined();

      result = XPathService.parse('/shiporder/orderperson/');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
      expect(result.exprNode).toBeDefined();

      result = XPathService.parse('/from/me/to/you');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
      expect(result.exprNode).toBeDefined();
    });

    it('should parse xpath with string literal', () => {
      const result = XPathService.parse("'Hello', /shiporder/orderperson, '!'");
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
      expect(result.exprNode).toBeDefined();
    });

    it('should parse numeric literal', () => {
      let result = XPathService.parse('128');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.exprNode).toBeDefined();
      let literals = XPathUtil.getAllNodesOfType<LiteralNode>(result.exprNode!, XPathNodeType.Literal);
      expect(literals.length).toEqual(1);
      expect(literals[0].value).toEqual(128);
      expect(literals[0].literalType).toEqual('integer');

      result = XPathService.parse('0.1');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.exprNode).toBeDefined();
      literals = XPathUtil.getAllNodesOfType<LiteralNode>(result.exprNode!, XPathNodeType.Literal);
      expect(literals.length).toEqual(1);
      expect(literals[0].value).toEqual(0.1);
      expect(literals[0].literalType).toEqual('decimal');

      result = XPathService.parse('4268.22752E11');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.exprNode).toBeDefined();
      literals = XPathUtil.getAllNodesOfType<LiteralNode>(result.exprNode!, XPathNodeType.Literal);
      expect(literals.length).toEqual(1);
      expect(literals[0].value).toEqual(4268.22752e11);
      expect(literals[0].literalType).toEqual('double');
    });

    it('should parse xpath with relative parent reference inside for-each', () => {
      const result = XPathService.parse('../Name');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
      expect(result.exprNode).toBeDefined();

      const result2 = XPathService.parse('../../Name');
      expect(result2.lexErrors.length).toEqual(0);
      expect(result2.parseErrors.length).toEqual(0);
      expect(result2.cst).toBeDefined();
      expect(result2.exprNode).toBeDefined();
    });

    describe('should parse with reserved word', () => {
      describe('in the path', () => {
        it('to in the middle of the path', () => {
          let result = XPathService.parse('/from/to/you');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
          expect(result.exprNode).toBeDefined();

          result = XPathService.parse('/to/from');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
          expect(result.exprNode).toBeDefined();
        });

        it('to as the last field', () => {
          const result = XPathService.parse('/note/to');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
          expect(result.exprNode).toBeDefined();
        });

        it('item in the middle of the path', () => {
          let result = XPathService.parse('/items/item/title');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
          expect(result.exprNode).toBeDefined();

          result = XPathService.parse('/item/title');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
          expect(result.exprNode).toBeDefined();
        });

        it('item as the last field', () => {
          const result = XPathService.parse('/items/item');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
          expect(result.exprNode).toBeDefined();
        });
      });

      describe('as a param name', () => {
        it('to', () => {
          const result = XPathService.parse('$to/me/from/you');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
          expect(result.exprNode).toBeDefined();
        });

        it('item', () => {
          const result = XPathService.parse('$item/title');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
          expect(result.exprNode).toBeDefined();
        });
      });

      it('in the predicate', () => {
        let result = XPathService.parse("/items[for='me']");
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        expect(result.exprNode).toBeDefined();

        result = XPathService.parse("/items[@for='me']");
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        expect(result.exprNode).toBeDefined();

        result = XPathService.parse("/items[item='me']");
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        expect(result.exprNode).toBeDefined();

        result = XPathService.parse("/items[@item='me']");
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        expect(result.exprNode).toBeDefined();
      });

      it('as an attribute name', () => {
        let result = XPathService.parse('/items/@for');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        expect(result.exprNode).toBeDefined();

        result = XPathService.parse('/items/@item');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        expect(result.exprNode).toBeDefined();

        result = XPathService.parse('$item/@node');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        expect(result.exprNode).toBeDefined();

        result = XPathService.parse('$node/@for');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        expect(result.exprNode).toBeDefined();
      });

      it('item in both param and path', () => {
        const result = XPathService.parse('$item/items/item/title');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        expect(result.exprNode).toBeDefined();
      });

      it('for in both param and path', () => {
        const result = XPathService.parse('$for/items/for');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        expect(result.exprNode).toBeDefined();
      });

      it('node in both param and path', () => {
        const result = XPathService.parse('$node/elements/node');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        expect(result.exprNode).toBeDefined();
      });
    });
  });

  describe('validate()', () => {
    it('should detect parse error', () => {
      const result = XPathService.validate('((');
      expect(result.hasErrors()).toBeTruthy();
    });

    it('should validate with empty string literal', () => {
      const result = XPathService.validate("/ns0:ShipOrder/ns0:OrderPerson != ''");
      expect(result.hasErrors()).toBeFalsy();
      expect(result.getExprNode()).toBeDefined();
    });

    it('should not get error with valid parenthesis', () => {
      let result = XPathService.validate('(/Hello)');
      expect(result.hasErrors()).toBeFalsy();
      result = XPathService.validate('((/Hello))');
      expect(result.hasErrors()).toBeFalsy();
    });

    it('should not get error with empty parenthesis', () => {
      let result = XPathService.validate('()');
      expect(result.hasErrors()).toBeFalsy();
      result = XPathService.validate('(())');
      expect(result.hasErrors()).toBeFalsy();
    });

    it('should not get error with empty function call', () => {
      const result = XPathService.validate('upper-case()');
      expect(result.hasErrors()).toBeFalsy();
    });

    it('should not get error with path in function call', () => {
      const result = XPathService.validate('upper-case(/aaa/bbb/ccc)');
      expect(result.hasErrors()).toBeFalsy();
    });

    it('should warn on empty expression', () => {
      const result = XPathService.validate('');
      expect(result.hasErrors()).toBeFalsy();
      expect(result.hasWarnings()).toBeTruthy();
      expect(result.getWarnings()).toContain('Empty Expression');
    });
  });

  describe('extractFieldPaths()', () => {
    it('should extract field paths from AST', () => {
      const paths = XPathService.extractFieldPaths('/aaa/bbb/ccc');
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeFalsy();
      expect(paths[0].documentReferenceName).toBeUndefined();
      expect(paths[0].pathSegments.length).toEqual(3);
      expect(paths[0].pathSegments[0].name).toEqual('aaa');
      expect(paths[0].pathSegments[1].name).toEqual('bbb');
      expect(paths[0].pathSegments[2].name).toEqual('ccc');
    });

    it('should extract param field from AST', () => {
      const paths = XPathService.extractFieldPaths('$param1/aaa/bbb/ccc');
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeFalsy();
      expect(paths[0].documentReferenceName).toEqual('param1');
      expect(paths[0].pathSegments.length).toEqual(3);
      expect(paths[0].pathSegments[0].name).toEqual('aaa');
      expect(paths[0].pathSegments[1].name).toEqual('bbb');
      expect(paths[0].pathSegments[2].name).toEqual('ccc');
    });

    it('should extract fields from function calls', () => {
      const paths = XPathService.extractFieldPaths('upper-case(/aaa/bbb/ddd)');
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeFalsy();
      expect(paths[0].documentReferenceName).toBeUndefined();
      expect(paths[0].pathSegments.length).toEqual(3);
      expect(paths[0].pathSegments[0].name).toEqual('aaa');
      expect(paths[0].pathSegments[1].name).toEqual('bbb');
      expect(paths[0].pathSegments[2].name).toEqual('ddd');
    });

    it('should extract fields from nested function calls', () => {
      const paths = XPathService.extractFieldPaths(
        'concatenate(/aaa/bbb/ccc, upper-case(aaa/bbb/ddd), lower-case($param1/eee/fff))',
      );
      expect(paths.length).toEqual(3);

      expect(paths[0].isRelative).toBeFalsy();
      expect(paths[0].documentReferenceName).toBeUndefined();
      expect(paths[0].pathSegments.length).toEqual(3);
      expect(paths[0].pathSegments[0].name).toEqual('aaa');
      expect(paths[0].pathSegments[1].name).toEqual('bbb');
      expect(paths[0].pathSegments[2].name).toEqual('ccc');

      expect(paths[1].isRelative).toBeTruthy();
      expect(paths[1].documentReferenceName).toBeUndefined();
      expect(paths[1].pathSegments.length).toEqual(3);
      expect(paths[1].pathSegments[0].name).toEqual('aaa');
      expect(paths[1].pathSegments[1].name).toEqual('bbb');
      expect(paths[1].pathSegments[2].name).toEqual('ddd');

      expect(paths[2].isRelative).toBeFalsy();
      expect(paths[2].documentReferenceName).toEqual('param1');
      expect(paths[2].pathSegments.length).toEqual(2);
      expect(paths[2].pathSegments[0].name).toEqual('eee');
      expect(paths[2].pathSegments[1].name).toEqual('fff');
    });

    it('should extract field paths with relative parent reference', () => {
      const contextPath = new PathExpression();
      contextPath.pathSegments = [new PathSegment('Org', false), new PathSegment('Person'), new PathSegment('Emails')];

      const paths = XPathService.extractFieldPaths('../Name', contextPath);
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeTruthy();
      expect(paths[0].pathSegments.length).toEqual(2);
      expect(paths[0].pathSegments[1].name).toEqual('Name');
    });

    it('should extract field path with ContextItemExpr (.)', () => {
      const contextPath = new PathExpression();
      contextPath.pathSegments = [new PathSegment('Org', false), new PathSegment('Person'), new PathSegment('Email')];

      const paths = XPathService.extractFieldPaths('.', contextPath);
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeFalsy();
      expect(paths[0].pathSegments.length).toEqual(3);
      expect(paths[0].pathSegments[2].name).toEqual('Email');
    });

    it('should extract primitive source body', () => {
      const paths = XPathService.extractFieldPaths('.');
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeFalsy();
      expect(paths[0].documentReferenceName).toBeUndefined();
      expect(paths[0].pathSegments.length).toEqual(0);
    });

    it('should extract from number formula', () => {
      const paths = XPathService.extractFieldPaths(
        'round(100*(PO1/PO1-04 * PO1/PO1-02 * .10 + (PO1/PO1-04 * PO1/PO1-02))) div 100',
      );
      expect(paths.length).toEqual(2);
      expect(paths[0].isRelative).toBeTruthy();
      expect(paths[0].documentReferenceName).toBeUndefined();
      expect(paths[0].pathSegments.length).toEqual(2);
      expect(paths[0].pathSegments[0].name).toEqual('PO1');
      expect(paths[0].pathSegments[1].name).toEqual('PO1-04');

      expect(paths[1].isRelative).toBeTruthy();
      expect(paths[1].documentReferenceName).toBeUndefined();
      expect(paths[1].pathSegments.length).toEqual(2);
      expect(paths[1].pathSegments[0].name).toEqual('PO1');
      expect(paths[1].pathSegments[1].name).toEqual('PO1-02');
    });

    it('should extract indexed collection', () => {
      const paths = XPathService.extractFieldPaths('/ns0:ShipOrder/Item[0]/Title');
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeFalsy();
    });

    it('should extract field paths from current() function in predicate', () => {
      const paths = XPathService.extractFieldPaths('Sub[current()/Sub/Typ="5032"]');
      expect(paths.length).toBeGreaterThan(0);

      const mainPath = paths.find((p) => p.pathSegments.length === 1 && p.pathSegments[0].name === 'Sub');
      expect(mainPath).toBeDefined();
      expect(mainPath?.pathSegments[0].predicates.length).toEqual(1);
    });

    it('should generate context item expression for empty relative path', () => {
      const emptyRelativePath = new PathExpression();
      emptyRelativePath.isRelative = true;
      emptyRelativePath.pathSegments = [];

      const xpathString = XPathService.toXPathString(emptyRelativePath);
      expect(xpathString).toEqual('.');
    });

    it('should extract field paths from empty parenthesized expression', () => {
      const paths = XPathService.extractFieldPaths('()');
      expect(paths.length).toEqual(0);
    });

    it('should extract field paths from nested parenthesized expression', () => {
      const paths = XPathService.extractFieldPaths('((/aaa/bbb))');
      expect(paths.length).toEqual(1);
      expect(paths[0].pathSegments.length).toEqual(2);
      expect(paths[0].pathSegments[0].name).toEqual('aaa');
      expect(paths[0].pathSegments[1].name).toEqual('bbb');
    });

    it('should extract field paths from context item in parentheses', () => {
      const contextPath = new PathExpression();
      contextPath.pathSegments = [new PathSegment('Root'), new PathSegment('Element')];
      const paths = XPathService.extractFieldPaths('(.)', contextPath);
      expect(paths.length).toEqual(1);
      expect(paths[0].pathSegments.length).toEqual(2);
      expect(paths[0].pathSegments[0].name).toEqual('Root');
      expect(paths[0].pathSegments[1].name).toEqual('Element');
    });

    it('should extract field paths with predicates containing PathExpression', () => {
      const paths = XPathService.extractFieldPaths('/Root/Element[@key=../OtherElement]');
      expect(paths.length).toEqual(1);
      expect(paths[0].pathSegments.length).toEqual(2);
      expect(paths[0].pathSegments[1].predicates.length).toEqual(1);
    });

    it('should extract absolute path without leading slash when relative', () => {
      const paths = XPathService.extractFieldPaths('aaa');
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeTruthy();
      expect(paths[0].pathSegments.length).toEqual(1);
      expect(paths[0].pathSegments[0].name).toEqual('aaa');
    });

    it('should extract path with current() without context path i.e. from root', () => {
      let paths = XPathService.extractFieldPaths('current()/Price');
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeTruthy();
      expect(paths[0].pathSegments.length).toEqual(1);
      expect(paths[0].pathSegments[0].name).toEqual('Price');

      paths = XPathService.extractFieldPaths('current()/../Price');
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeTruthy();
      expect(paths[0].pathSegments.length).toEqual(2);
      expect(paths[0].pathSegments[1].name).toEqual('Price');
    });

    it('should extract path with current() with context path', () => {
      const contextPath = new PathExpression();
      contextPath.pathSegments = [new PathSegment('Root'), new PathSegment('Element')];
      let paths = XPathService.extractFieldPaths('current()/Price', contextPath);
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeTruthy();
      expect(paths[0].pathSegments.length).toEqual(1);
      expect(paths[0].pathSegments[0].name).toEqual('Price');

      paths = XPathService.extractFieldPaths('current()/../Price', contextPath);
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeTruthy();
      expect(paths[0].pathSegments.length).toEqual(2);
      expect(paths[0].pathSegments[1].name).toEqual('Price');
    });

    describe('should extract field paths with reserved keyword', () => {
      it('to', () => {
        const paths = XPathService.extractFieldPaths('/note/to');
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(2);
        expect(paths[0].pathSegments[0].name).toEqual('note');
        expect(paths[0].pathSegments[1].name).toEqual('to');
      });

      it('item', () => {
        const paths = XPathService.extractFieldPaths('/items/item/title');
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(3);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('item');
        expect(paths[0].pathSegments[2].name).toEqual('title');
      });

      it('to as a variable name', () => {
        const paths = XPathService.extractFieldPaths('$to/address');
        expect(paths.length).toEqual(1);
        expect(paths[0].documentReferenceName).toEqual('to');
        expect(paths[0].pathSegments.length).toEqual(1);
        expect(paths[0].pathSegments[0].name).toEqual('address');
      });

      it('in predicate', () => {
        let paths = XPathService.extractFieldPaths("/items/item[to='me']");
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(2);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('item');
        expect(paths[0].pathSegments[1].predicates.length).toEqual(1);
        let predicate = paths[0].pathSegments[1].predicates[0];
        expect(predicate.left).toBeInstanceOf(PathExpression);
        expect((predicate.left as PathExpression).pathSegments[0].name).toEqual('to');
        expect(predicate.right).toEqual('me');

        paths = XPathService.extractFieldPaths("/items/item[item='some']");
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(2);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('item');
        expect(paths[0].pathSegments[1].predicates.length).toEqual(1);
        predicate = paths[0].pathSegments[1].predicates[0];
        expect(predicate.left).toBeInstanceOf(PathExpression);
        expect((predicate.left as PathExpression).pathSegments[0].name).toEqual('item');
        expect(predicate.right).toEqual('some');

        paths = XPathService.extractFieldPaths("/items/item[@to='me']");
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(2);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('item');
        expect(paths[0].pathSegments[1].predicates.length).toEqual(1);
        predicate = paths[0].pathSegments[1].predicates[0];
        expect(predicate.left).toBeInstanceOf(PathExpression);
        expect((predicate.left as PathExpression).pathSegments[0].name).toEqual('to');
        expect((predicate.left as PathExpression).pathSegments[0].isAttribute).toBeTruthy();
        expect(predicate.right).toEqual('me');

        paths = XPathService.extractFieldPaths("/items/item[@item='some']");
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(2);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('item');
        expect(paths[0].pathSegments[1].predicates.length).toEqual(1);
        predicate = paths[0].pathSegments[1].predicates[0];
        expect(predicate.left).toBeInstanceOf(PathExpression);
        expect((predicate.left as PathExpression).pathSegments[0].name).toEqual('item');
        expect((predicate.left as PathExpression).pathSegments[0].isAttribute).toBeTruthy();
        expect(predicate.right).toEqual('some');
      });

      it('for as an attribute', () => {
        const paths = XPathService.extractFieldPaths('/items/@for');
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(2);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('for');
        expect(paths[0].pathSegments[1].isAttribute).toBeTruthy();
      });

      it('multiple', () => {
        const paths = XPathService.extractFieldPaths('$item/items/item/node');
        expect(paths.length).toEqual(1);
        expect(paths[0].documentReferenceName).toEqual('item');
        expect(paths[0].pathSegments.length).toEqual(3);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('item');
        expect(paths[0].pathSegments[2].name).toEqual('node');
      });
    });
  });

  describe('toXPathString()', () => {
    it('should generate XPath with document reference', () => {
      const pe = new PathExpression();
      pe.documentReferenceName = 'Account-x';
      const xpath = XPathService.toXPathString(pe);
      expect(xpath).toEqual('$Account-x');
    });

    it('should generate XPath with predicates', () => {
      const pe = new PathExpression();
      const key = new PathExpression(undefined, true);
      key.pathSegments = [new PathSegment('key', true)];
      pe.pathSegments.push(
        new PathSegment('Element', false, '', [new Predicate(key, PredicateOperator.Equal, 'value')]),
      );
      const xpath = XPathService.toXPathString(pe);
      expect(xpath).toEqual("/Element[@key='value']");
    });

    it('should generate XPath with namespace prefix', () => {
      const pe = new PathExpression();
      pe.pathSegments.push(new PathSegment('Element', false, 'ns0'));
      const xpath = XPathService.toXPathString(pe);
      expect(xpath).toEqual('/ns0:Element');
    });

    it('should generate XPath with attribute', () => {
      const pe = new PathExpression();
      pe.pathSegments.push(new PathSegment('attr', true, 'ns0'));
      const xpath = XPathService.toXPathString(pe);
      expect(xpath).toEqual('/ns0:@attr');
    });

    it('should generate context item expression for empty relative path', () => {
      const emptyRelativePath = new PathExpression();
      emptyRelativePath.isRelative = true;
      emptyRelativePath.pathSegments = [];

      const xpathString = XPathService.toXPathString(emptyRelativePath);
      expect(xpathString).toEqual('.');
    });

    it('should generate XPath with multiple predicates using and', () => {
      const pe = new PathExpression();

      const key1 = new PathExpression(undefined, true);
      key1.pathSegments = [new PathSegment('key1', true)];
      const key2 = new PathExpression(undefined, true);
      key2.pathSegments.push(new PathSegment('key2', true));

      pe.pathSegments.push(
        new PathSegment('Element', false, '', [
          new Predicate(key1, PredicateOperator.Equal, 'value1'),
          new Predicate(key2, PredicateOperator.Equal, 'value2'),
        ]),
      );
      const xpath = XPathService.toXPathString(pe);
      expect(xpath).toEqual("/Element[@key1='value1' and @key2='value2']");
    });

    it('should generate XPath with PathExpression in predicate', () => {
      const predicatePath = new PathExpression(undefined, true);
      predicatePath.pathSegments.push(new PathSegment('OtherElement'));

      const pe = new PathExpression();
      pe.pathSegments.push(
        new PathSegment('Element', false, '', [new Predicate(predicatePath, PredicateOperator.Equal, 'value')]),
      );
      const xpath = XPathService.toXPathString(pe);
      expect(xpath).toEqual("/Element[OtherElement='value']");
    });

    it('should generate relative XPath with document reference and slash separator', () => {
      const pe = new PathExpression();
      pe.isRelative = true;
      pe.documentReferenceName = 'param1';
      pe.pathSegments.push(new PathSegment('Element'));
      let xpath = XPathService.toXPathString(pe);
      expect(xpath).toEqual('Element');

      pe.isRelative = false;
      xpath = XPathService.toXPathString(pe);
      expect(xpath).toEqual('$param1/Element');
    });
  });

  describe('toAbsolutePath()', () => {
    it('should return same path if already absolute', () => {
      const absolutePath = new PathExpression();
      absolutePath.pathSegments.push(new PathSegment('Root'), new PathSegment('Element'));

      const result = XPathService.toAbsolutePath(absolutePath);
      expect(result).toBe(absolutePath);
      expect(result.pathSegments.length).toEqual(2);
    });

    it('should convert relative path with parent references', () => {
      const contextPath = new PathExpression();
      contextPath.pathSegments.push(new PathSegment('Root'), new PathSegment('Parent'), new PathSegment('Current'));

      const relativePath = new PathExpression(contextPath);
      relativePath.pathSegments.push(new PathSegment('..'), new PathSegment('Sibling'));

      const absolutePath = XPathService.toAbsolutePath(relativePath);
      expect(absolutePath.pathSegments.length).toEqual(3);
      expect(absolutePath.pathSegments[0].name).toEqual('Root');
      expect(absolutePath.pathSegments[1].name).toEqual('Parent');
      expect(absolutePath.pathSegments[2].name).toEqual('Sibling');
    });

    it('should handle multiple parent references', () => {
      const contextPath = new PathExpression();
      contextPath.pathSegments.push(new PathSegment('A'), new PathSegment('B'), new PathSegment('C'));

      const relativePath = new PathExpression(contextPath);
      relativePath.pathSegments.push(new PathSegment('..'), new PathSegment('..'), new PathSegment('D'));

      const absolutePath = XPathService.toAbsolutePath(relativePath);
      expect(absolutePath.pathSegments.length).toEqual(2);
      expect(absolutePath.pathSegments[0].name).toEqual('A');
      expect(absolutePath.pathSegments[1].name).toEqual('D');
    });

    it('should propagate documentReferenceName from nested context paths', () => {
      const rootContext = new PathExpression();
      rootContext.documentReferenceName = 'param1';
      rootContext.pathSegments.push(new PathSegment('Root'));

      const nestedContext = new PathExpression(rootContext);
      nestedContext.pathSegments.push(new PathSegment('Nested'));

      const relativePath = new PathExpression(nestedContext);
      relativePath.pathSegments.push(new PathSegment('Field'));

      const absolutePath = XPathService.toAbsolutePath(relativePath);
      expect(absolutePath.documentReferenceName).toEqual('param1');
      expect(absolutePath.pathSegments.length).toEqual(3);
      expect(absolutePath.pathSegments[0].name).toEqual('Root');
      expect(absolutePath.pathSegments[1].name).toEqual('Nested');
      expect(absolutePath.pathSegments[2].name).toEqual('Field');
    });
  });

  describe('addSource()', () => {
    it('should add source to empty expression', () => {
      const source = new PathExpression();
      source.pathSegments.push(new PathSegment('Field'));

      const result = XPathService.addSource('', source);
      expect(result).toEqual('/Field');
    });

    it('should add source to existing expression with comma', () => {
      const source = new PathExpression();
      source.pathSegments.push(new PathSegment('Field2'));

      const result = XPathService.addSource('/Field1', source);
      expect(result).toEqual('/Field1, /Field2');
    });
  });

  it('getXPathFunctionDefinitions()', () => {
    const functionDefs = XPathService.getXPathFunctionDefinitions();
    expect(Object.keys(functionDefs).length).toBeGreaterThan(9);
  });

  it('getMonacoXPathLanguageMetadata()', () => {
    const metadata = XPathService.getMonacoXPathLanguageMetadata();
    expect(metadata.id).toEqual('xpath');
  });

  describe('toPathExpression()', () => {
    let bodyDoc: IDocument;
    let cart2Doc: IDocument;

    beforeEach(() => {
      const bodyDefinition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'shipOrder.xsd': shipOrderXsd },
      );
      bodyDoc = XmlSchemaDocumentService.createXmlSchemaDocument(bodyDefinition).document!;
      const cart2Definition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.XML_SCHEMA, 'Cart2', {
        'cart.xsd': cartXsd,
      });
      cart2Doc = XmlSchemaDocumentService.createXmlSchemaDocument(cart2Definition).document!;
    });

    it('should generate relative path when source and context are from same document', () => {
      const contextPath = new PathExpression();
      contextPath.isRelative = false;
      contextPath.pathSegments = [new PathSegment('ShipOrder', false), new PathSegment('Item', false)];

      const shipOrderField = bodyDoc.fields.find((f) => f.name === 'ShipOrder')!;
      const itemField = shipOrderField.fields.find((f) => f.name === 'Item')!;
      const titleField = itemField.fields.find((f) => f.name === 'Title')!;

      const result = XPathService.toPathExpression({}, titleField, contextPath);

      expect(result.isRelative).toBe(true);
      expect(result.documentReferenceName).toBeUndefined();
      expect(result.pathSegments.length).toBe(1);
      expect(result.pathSegments[0].name).toBe('Title');
    });

    it('should generate absolute path when source and context are from different documents', () => {
      const contextPath = new PathExpression();
      contextPath.isRelative = false;
      contextPath.documentReferenceName = undefined;
      contextPath.pathSegments = [new PathSegment('ShipOrder', false), new PathSegment('Item', false)];

      const cartField = cart2Doc.fields.find((f) => f.name === 'Cart')!;
      const itemField = cartField.fields.find((f) => f.name === 'Item')!;
      const noteField = itemField.fields.find((f) => f.name === 'Note')!;

      const result = XPathService.toPathExpression({}, noteField, contextPath);

      expect(result.isRelative).toBeFalsy();
      expect(result.documentReferenceName).toBe('Cart2');
      expect(result.pathSegments.length).toBe(3);
      expect(result.pathSegments[0].name).toBe('Cart');
      expect(result.pathSegments[1].name).toBe('Item');
      expect(result.pathSegments[2].name).toBe('Note');
    });

    it('should generate absolute path when context is from param and source is from body', () => {
      const contextPath = new PathExpression();
      contextPath.isRelative = false;
      contextPath.documentReferenceName = 'Cart1';
      contextPath.pathSegments = [new PathSegment('Cart', false), new PathSegment('Item', false)];

      const shipOrderField = bodyDoc.fields.find((f) => f.name === 'ShipOrder')!;
      const orderPersonField = shipOrderField.fields.find((f) => f.name === 'OrderPerson')!;

      const result = XPathService.toPathExpression({}, orderPersonField, contextPath);

      expect(result.isRelative).toBeFalsy();
      expect(result.documentReferenceName).toBeUndefined();
      expect(result.pathSegments.length).toBe(2);
      expect(result.pathSegments[0].name).toBe('ShipOrder');
      expect(result.pathSegments[1].name).toBe('OrderPerson');
    });
  });
});
