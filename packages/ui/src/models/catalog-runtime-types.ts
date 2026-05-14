/**
 * Catalog runtime types used throughout the application.
 *
 * - CAMEL_RUNTIMES: Apache Camel integration runtimes (Main, Quarkus, Spring Boot)
 * - TEST_RUNTIMES: Test framework runtimes (Citrus)
 */

/** Camel integration runtimes */
export const CAMEL_RUNTIMES = ['Main', 'Quarkus', 'Spring Boot'] as const;

/** Test framework runtimes */
export const TEST_RUNTIMES = ['Citrus'] as const;
