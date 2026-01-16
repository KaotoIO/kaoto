import { TestActionResult } from '../../../citrus/entities/TestResult';
import { CitrusTestReportService } from './citrus-test-report.service';

describe('CitrusTestReportService', () => {
  describe('toModelPath', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(CitrusTestReportService.toModelPath('send-request')).toBe('sendRequest');
    });

    it('should replace colons with dashes', () => {
      expect(CitrusTestReportService.toModelPath('http:send')).toBe('http-send');
    });

    it('should handle combined kebab-case and colons', () => {
      expect(CitrusTestReportService.toModelPath('http:send-request')).toBe('http-sendRequest');
    });

    it('should return path unchanged if no conversion needed', () => {
      expect(CitrusTestReportService.toModelPath('print')).toBe('print');
    });
  });

  describe('findResult', () => {
    const topLevelActions: TestActionResult[] = [
      { name: 'print', path: 'print' },
      { name: 'delay', path: 'delay' },
    ];

    it('should find a matching action result at top level', () => {
      const result = CitrusTestReportService.findResult('print', topLevelActions);

      expect(result).toBeDefined();
      expect(result?.name).toBe('print');
    });

    it('should find a matching action result in nested actions', () => {
      const actions: TestActionResult[] = [
        {
          name: 'iterate',
          path: 'iterate',
          actions: [{ name: 'print', path: 'print' }],
        },
      ];

      const result = CitrusTestReportService.findResult('print', actions);

      expect(result).toBeDefined();
      expect(result?.name).toBe('print');
    });

    it('should find a matching action result in iterations', () => {
      const actions: TestActionResult[] = [
        {
          name: 'iterate',
          path: 'iterate',
          iterations: [
            {
              name: 'iteration-0',
              path: 'iteration-0',
              actions: [{ name: 'send-request', path: 'send-request' }],
            },
          ],
        },
      ];

      const result = CitrusTestReportService.findResult('sendRequest', actions);

      expect(result).toBeDefined();
      expect(result?.name).toBe('send-request');
    });

    it('should return undefined when no match exists', () => {
      const result = CitrusTestReportService.findResult('nonExistent', topLevelActions);

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty actions array', () => {
      const result = CitrusTestReportService.findResult('print', []);

      expect(result).toBeUndefined();
    });
  });

  describe('findError', () => {
    it('should find error for a matching action with an error', () => {
      const actions: TestActionResult[] = [{ name: 'print', path: 'print', error: 'Something went wrong' }];

      const result = CitrusTestReportService.findError('print', actions);

      expect(result).toBe('Something went wrong');
    });

    it('should return undefined when action matches but has no error', () => {
      const actions: TestActionResult[] = [{ name: 'print', path: 'print' }];

      const result = CitrusTestReportService.findError('print', actions);

      expect(result).toBeUndefined();
    });

    it('should return undefined when path is undefined', () => {
      const actions: TestActionResult[] = [{ name: 'print', path: 'print', error: 'fail' }];

      const result = CitrusTestReportService.findError(undefined, actions);

      expect(result).toBeUndefined();
    });

    it('should find error in nested actions', () => {
      const actions: TestActionResult[] = [
        {
          name: 'iterate',
          path: 'iterate',
          actions: [{ name: 'print', path: 'print', error: 'Nested error' }],
        },
      ];

      const result = CitrusTestReportService.findError('print', actions);

      expect(result).toBe('Nested error');
    });

    it('should find error in iterations', () => {
      const actions: TestActionResult[] = [
        {
          name: 'iterate',
          path: 'iterate',
          iterations: [
            {
              name: 'iteration-0',
              path: 'iteration-0',
              actions: [{ name: 'send-request', path: 'send-request', error: 'Iteration error' }],
            },
          ],
        },
      ];

      const result = CitrusTestReportService.findError('sendRequest', actions);

      expect(result).toBe('Iteration error');
    });

    it('should return undefined for empty actions array', () => {
      const result = CitrusTestReportService.findError('print', []);

      expect(result).toBeUndefined();
    });
  });
});
