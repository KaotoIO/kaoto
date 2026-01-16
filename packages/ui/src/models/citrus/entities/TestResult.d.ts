/**
 * Test result
 */
export interface TestReportEntry {
  name: string;
  result: TestResult;
  actions: TestActionResult[];
}

/**
 * Test result
 */
export interface TestResult {
  testName: string;
  className?: string;
  cause?: string;
  errorMessage?: string;
  duration?: number;
  result: string;
  success: boolean;
  failed: boolean;
  skipped?: boolean;
}

export interface TestActionResult {
  name: string;
  path: string;
  error?: string;
  actions?: TestActionResult[];
  iterations?: TestActionResult[];
  message?: {
    name: string;
    type: string;
    headers?: {
      name: string;
      value: string;
    }[];
    headerData?: string[];
    payload?: string;
  };
}
