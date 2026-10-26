import { TestActionResult } from '../../../citrus/entities/TestResult';
import { CitrusTestReportService } from './citrus-test-report.service';

describe('CitrusTestReportService', () => {
  describe('toModelPath', () => {
    it('should replace colons with dashes', () => {
      expect(CitrusTestReportService.toModelPath('http:send')).toBe('http-send');
    });

    it('should replace multiple colons with dashes', () => {
      expect(CitrusTestReportService.toModelPath('camel:infra:run')).toBe('camel-infra-run');
    });

    it('should preserve kebab-case segments', () => {
      expect(CitrusTestReportService.toModelPath('send-request')).toBe('send-request');
    });

    it('should handle combined kebab-case and colons', () => {
      expect(CitrusTestReportService.toModelPath('http:send-request')).toBe('http-send-request');
    });

    it('should return path unchanged if no conversion needed', () => {
      expect(CitrusTestReportService.toModelPath('print')).toBe('print');
    });
  });

  describe('findResult', () => {
    const topLevelActions: TestActionResult[] = [
      { name: 'print', path: 'actions.0.print' },
      { name: 'delay', path: 'actions.1.delay' },
    ];

    it('should find a matching action result at top level', () => {
      const result = CitrusTestReportService.findResult('actions.0.print', topLevelActions);

      expect(result).toBeDefined();
      expect(result?.name).toBe('print');
    });

    it('should find a matching action result in nested actions', () => {
      const actions: TestActionResult[] = [
        {
          name: 'iterate',
          path: 'actions.0.iterate',
          actions: [{ name: 'print', path: 'actions.0.iterate.actions.0.print' }],
        },
      ];

      const result = CitrusTestReportService.findResult('actions.0.iterate.actions.0.print', actions);

      expect(result).toBeDefined();
      expect(result?.name).toBe('print');
    });

    it('should find a matching action result in iterations', () => {
      const actions: TestActionResult[] = [
        {
          name: 'iterate',
          path: 'actions.0.iterate',
          iterations: [
            {
              name: 'iteration-0',
              path: 'iteration-0',
              actions: [{ name: 'send-request', path: 'actions.0.send-request' }],
            },
          ],
        },
      ];

      const result = CitrusTestReportService.findResult('actions.0.send-request', actions);

      expect(result).toBeDefined();
      expect(result?.name).toBe('send-request');
    });

    it('should find a matching action result with colon-separated group path', () => {
      const actions: TestActionResult[] = [{ name: 'http:send-request', path: 'actions.0.http:send-request' }];

      const result = CitrusTestReportService.findResult('actions.0.http-send-request', actions);

      expect(result).toBeDefined();
      expect(result?.name).toBe('http:send-request');
    });

    it('should match by index position when action group segments are in wrong order (Citrus bug workaround)', () => {
      const actions: TestActionResult[] = [{ name: 'camel:run-infra', path: 'actions.0.camel:run-infra' }];

      const result = CitrusTestReportService.findResult('actions.0.camel-infra-run', actions);

      expect(result).toBeDefined();
      expect(result?.name).toBe('camel:run-infra');
    });

    it('should return undefined when no match exists', () => {
      const result = CitrusTestReportService.findResult('nonExistent', topLevelActions);

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty actions array', () => {
      const result = CitrusTestReportService.findResult('actions.0.print', []);

      expect(result).toBeUndefined();
    });

    it('should not stop searching siblings when nested search returns undefined', () => {
      const actions: TestActionResult[] = [
        {
          name: 'iterate',
          path: 'actions.0.iterate',
          actions: [{ name: 'print', path: 'actions.0.iterate.actions.0.print' }],
        },
        { name: 'delay', path: 'actions.1.delay' },
      ];

      const result = CitrusTestReportService.findResult('actions.1.delay', actions);

      expect(result).toBeDefined();
      expect(result?.name).toBe('delay');
    });
  });

  describe('findError', () => {
    it('should find error for a matching action with an error', () => {
      const actions: TestActionResult[] = [{ name: 'print', path: 'actions.0.print', error: 'Something went wrong' }];

      const result = CitrusTestReportService.findError('actions.0.print', actions);

      expect(result).toBe('Something went wrong');
    });

    it('should return undefined when action matches but has no error', () => {
      const actions: TestActionResult[] = [{ name: 'print', path: 'actions.0.print' }];

      const result = CitrusTestReportService.findError('actions.0.print', actions);

      expect(result).toBeUndefined();
    });

    it('should return undefined when path is undefined', () => {
      const actions: TestActionResult[] = [{ name: 'print', path: 'actions.0.print', error: 'fail' }];

      const result = CitrusTestReportService.findError(undefined, actions);

      expect(result).toBeUndefined();
    });

    it('should find error in nested actions', () => {
      const actions: TestActionResult[] = [
        {
          name: 'iterate',
          path: 'actions.0.iterate',
          actions: [{ name: 'print', path: 'actions.0.iterate.actions.0.print', error: 'Nested error' }],
        },
      ];

      const result = CitrusTestReportService.findError('actions.0.iterate.actions.0.print', actions);

      expect(result).toBe('Nested error');
    });

    it('should find error in iterations', () => {
      const actions: TestActionResult[] = [
        {
          name: 'iterate',
          path: 'actions.0.iterate',
          iterations: [
            {
              name: 'iteration-0',
              path: 'iteration-0',
              actions: [{ name: 'send-request', path: 'actions.0.send-request', error: 'Iteration error' }],
            },
          ],
        },
      ];

      const result = CitrusTestReportService.findError('actions.0.send-request', actions);

      expect(result).toBe('Iteration error');
    });

    it('should find error with colon-separated group path', () => {
      const actions: TestActionResult[] = [
        { name: 'http:send-request', path: 'actions.0.http:send-request', error: 'Group error' },
      ];

      const result = CitrusTestReportService.findError('actions.0.http-send-request', actions);

      expect(result).toBe('Group error');
    });

    it('should find error when action group segments are in wrong order (Citrus bug workaround)', () => {
      const actions: TestActionResult[] = [
        { name: 'camel:run-infra', path: 'actions.0.camel:run-infra', error: 'Infra error' },
      ];

      const result = CitrusTestReportService.findError('actions.0.camel-infra-run', actions);

      expect(result).toBe('Infra error');
    });

    it('should return undefined for empty actions array', () => {
      const result = CitrusTestReportService.findError('actions.0.print', []);

      expect(result).toBeUndefined();
    });
  });
});
