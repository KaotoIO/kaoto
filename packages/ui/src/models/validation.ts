export interface ValidationResult {
  status: ValidationStatus;
  errMessages: string[];
}

export const enum ValidationStatus {
  Default = 'default',
  Warning = 'warning',
  Success = 'success',
  Error = 'error',
}
