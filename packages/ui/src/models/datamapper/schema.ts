/**
 * Common report produced by schema analysis services, consumed by UI components
 * in a format-agnostic way. Extended by {@link XmlSchemaAnalysisReport} and
 * {@link JsonSchemaAnalysisReport} with format-specific details.
 */
export interface SchemaAnalysisReport {
  /** Topologically sorted file identifiers — dependencies come before dependents. */
  loadOrder: string[];
  /** Errors that prevent schema loading (missing dependencies, circular includes). */
  errors: string[];
  /** Non-fatal issues such as circular imports that are allowed but noteworthy. */
  warnings: string[];
}
