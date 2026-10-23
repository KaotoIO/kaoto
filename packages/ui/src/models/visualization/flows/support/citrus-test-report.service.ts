import { TestActionResult } from '../../../citrus/entities/TestResult';

/**
 * TestActionReportService
 *
 * This class is meant to provide utility functions for test reports.
 */
export class CitrusTestReportService {
  /**
   * Finds the first test action result that matches the given action path.
   */
  static findResult(path: string, actions: TestActionResult[]): TestActionResult | undefined {
    for (const action of actions) {
      if (this.matchPath(action.path, path)) {
        return action;
      }

      if (action.actions) {
        const found = this.findResult(path, action.actions);
        if (found !== undefined) {
          return found;
        }
      }

      for (const iteration of action.iterations || []) {
        if (iteration.actions) {
          const found = this.findResult(path, iteration.actions);
          if (found !== undefined) {
            return found;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Find error in list of test results matching the given action path.
   * Traverse through the test actions including nested actions on test containers and iterations.
   * Returns the error message of the first matching test action result or undefined if no matching test result.
   */
  static findError(path: string | undefined, actions: TestActionResult[]): string | undefined {
    if (!path) {
      return undefined;
    }

    for (const action of actions) {
      if (action.error && this.matchPath(action.path, path)) {
        return action.error;
      }

      if (action.actions) {
        const errorMsg = this.findError(path, action.actions);
        if (errorMsg) {
          return errorMsg;
        }
      }

      for (const iteration of action.iterations || []) {
        if (iteration.actions) {
          const iterationError = this.findError(path, iteration.actions);
          if (iterationError) {
            return iterationError;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Convert a report path to the model path format used by the UI.
   * Replaces colons with dashes to match the UI's action naming convention
   * (e.g. "http:send-request" → "http-send-request").
   */
  static toModelPath(path: string): string {
    return path.replace(/:/g, '-');
  }

  /**
   * Match a report action path against a UI model path.
   * First tries an exact match after converting the report path. If that fails,
   * falls back to comparing by sorted name segments — this works around a Citrus
   * bug where multi-level action groups produce paths with segments in the wrong
   * order (e.g. "camel:run-infra" instead of "camel:infra:run").
   */
  private static matchPath(reportPath: string, uiPath: string): boolean {
    if (this.toModelPath(reportPath) === uiPath) {
      return true;
    }

    const reportSegments = reportPath.split('.');
    const uiSegments = uiPath.split('.');
    if (reportSegments.length !== uiSegments.length) {
      return false;
    }

    for (let i = 0; i < reportSegments.length; i++) {
      if (/^\d+$/.test(reportSegments[i]) || reportSegments[i] === 'actions' || reportSegments[i] === 'iterations') {
        if (reportSegments[i] !== uiSegments[i]) {
          return false;
        }
      } else {
        const reportParts = reportSegments[i].split(/[:-]/).sort();
        const uiParts = uiSegments[i].split(/[:-]/).sort();
        if (reportParts.join(',') !== uiParts.join(',')) {
          return false;
        }
      }
    }

    return true;
  }
}
