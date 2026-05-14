/**
 * Catalog runtime types used throughout the application.
 *
 * - CAMEL_RUNTIMES: Apache Camel integration runtimes (Main, Quarkus, Spring Boot)
 * - TEST_RUNTIMES: Test framework runtimes (Citrus)
 * - CAMEL_MAIN_RUNTIME: Primary Camel runtime identifier
 */

/** Camel integration runtimes */
export const CAMEL_RUNTIMES = ['Main', 'Quarkus', 'Spring Boot'] as const;

/** Test framework runtimes */
export const TEST_RUNTIMES = ['Citrus'] as const;

/** Primary Camel Main runtime - used for Red Hat version prioritization */
export const CAMEL_MAIN_RUNTIME = 'Main' as const;
