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
      if (this.toModelPath(action.path) === path) {
        return action;
      }

      if (action.actions) {
        return this.findResult(path, action.actions);
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
  static findError(path: string, actions: TestActionResult[]): string | undefined {
    for (const action of actions) {
      if (action.error && this.toModelPath(action.path) === path) {
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
   * Message content in test action results are base64 encoded. Now is the time to decode.
   */
  static decodeMessageContent(actions: TestActionResult[]) {
    for (const action of actions) {
      if (action.message) {
        const message = action.message;
        if (message.payload !== undefined) {
          // ToDo: find proper way to decode bas64
          message.payload = atob(`${message.payload}`);
        }

        if (message.headerData !== undefined) {
          const headerDataItems = message.headerData as string[];
          message.headerData = headerDataItems.map((headerDataItem, _index, _array) => {
            // ToDo: find proper way to decode bas64
            return atob(`${headerDataItem}`);
          });
        }
      }

      if (action.actions) {
        this.decodeMessageContent(action.actions);
      }

      if (action.iterations) {
        this.decodeMessageContent(action.iterations);
      }
    }
  }

  static toModelPath(path: string) {
    return path
      .replace(/-([a-z])/g, function (v) {
        return v.substring(1).toUpperCase();
      })
      .replace(/:/g, '-');
  }
}
