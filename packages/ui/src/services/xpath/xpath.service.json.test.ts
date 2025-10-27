import { XPathService } from './xpath.service';
import { PathExpression, PredicateOperator } from '../../models/datamapper/xpath';

describe('XPathService / JSON', () => {
  describe('parse()', () => {
    it('should parse JSON representation', () => {
      let result = XPathService.parse("$Account-x/fn:map/fn:string[@key='AccountId']");
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
      expect(result.exprNode).toBeDefined();

      result = XPathService.parse(
        "upper-case(concat('ORD-', $Account-x/fn:map/fn:string[@key='AccountId'], '-', $OrderSequence))",
      );
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
      expect(result.exprNode).toBeDefined();
    });
  });

  describe('validate()', () => {
    it('should validate JSON representation', () => {
      let result = XPathService.validate("$Account-x/fn:map/fn:string[@key='AccountId']");
      expect(result.hasErrors()).toBeFalsy();
      expect(result.hasWarnings()).toBeFalsy();

      result = XPathService.validate(
        "upper-case(concat('ORD-', $Account-x/fn:map/fn:string[@key='AccountId'], '-', $OrderSequence))",
      );
      expect(result.hasErrors()).toBeFalsy();
      expect(result.hasWarnings()).toBeFalsy();
    });
  });

  describe('extractFieldPaths()', () => {
    it('extract JSON representation', () => {
      const paths = XPathService.extractFieldPaths("$Account-x/fn:map/fn:string[@key='AccountId']");
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toEqual(false);
      expect(paths[0].pathSegments.length).toEqual(2);
      expect(paths[0].pathSegments[0].isAttribute).toEqual(false);
      expect(paths[0].pathSegments[0].prefix).toEqual('fn');
      expect(paths[0].pathSegments[0].name).toEqual('map');
      expect(paths[0].pathSegments[0].predicates).toEqual([]);
      expect(paths[0].pathSegments[1].isAttribute).toEqual(false);
      expect(paths[0].pathSegments[1].prefix).toEqual('fn');
      expect(paths[0].pathSegments[1].name).toEqual('string');
      expect(paths[0].pathSegments[1].predicates).toBeDefined();

      const seg2Predicates = paths[0].pathSegments[1].predicates;
      expect(seg2Predicates.length).toEqual(1);
      const leftPath = seg2Predicates[0].left as PathExpression;
      expect(leftPath.pathSegments[0].isAttribute).toBeTruthy();
      expect(leftPath.pathSegments[0].name).toEqual('key');
      expect(seg2Predicates[0].operator).toEqual(PredicateOperator.Equal);
      expect(seg2Predicates[0].right).toEqual('AccountId');
    });

    it('extract JSON representation inside function call', () => {
      const paths = XPathService.extractFieldPaths(
        "upper-case(concat('ORD-', $Account-x/fn:map/fn:string[@key='AccountId'], '-', $OrderSequence))",
      );
      expect(paths.length).toEqual(2);
      expect(paths[0].isRelative).toEqual(false);
      expect(paths[0].pathSegments.length).toEqual(2);
      expect(paths[0].pathSegments[0].isAttribute).toEqual(false);
      expect(paths[0].pathSegments[0].prefix).toEqual('fn');
      expect(paths[0].pathSegments[0].name).toEqual('map');
      expect(paths[0].pathSegments[0].predicates).toEqual([]);
      expect(paths[0].pathSegments[1].isAttribute).toEqual(false);
      expect(paths[0].pathSegments[1].prefix).toEqual('fn');
      expect(paths[0].pathSegments[1].name).toEqual('string');
      expect(paths[0].pathSegments[1].predicates).toBeDefined();

      const seg2Predicates = paths[0].pathSegments[1].predicates;
      expect(seg2Predicates.length).toEqual(1);
      const leftPath = seg2Predicates[0].left as PathExpression;
      expect(leftPath.pathSegments[0].isAttribute).toBeTruthy();
      expect(leftPath.pathSegments[0].name).toEqual('key');
      expect(seg2Predicates[0].operator).toEqual(PredicateOperator.Equal);
      expect(seg2Predicates[0].right).toEqual('AccountId');
    });
  });
});
