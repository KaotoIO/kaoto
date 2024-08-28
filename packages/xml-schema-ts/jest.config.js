/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
export default {
  testEnvironment: 'jsdom',
  reporters: ['default'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  moduleDirectories: ['node_modules'],
  testMatch: ['**/?(*.)+(test).[tj]s?(x)'],
  modulePathIgnorePatterns: ['dist'],

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    // Collect coverage from all ts and tsx files in the src folder
    'src/**/*.{ts,tsx}',
    // Ignore all test files
    '!src/**/*.test.{ts,tsx}',
    // Ignore all declaration files
    '!src/**/*.d.ts',
  ],

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: ['\\\\node_modules\\\\'],

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'babel',
};
