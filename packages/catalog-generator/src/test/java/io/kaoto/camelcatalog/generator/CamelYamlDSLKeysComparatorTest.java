/*
 * Copyright (C) 2023 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.kaoto.camelcatalog.generator;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Comparator;
import java.util.List;

import org.apache.camel.catalog.DefaultCamelCatalog;
import org.apache.camel.tooling.model.EipModel;
import org.apache.camel.tooling.model.Kind;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CamelYamlDSLKeysComparatorTest {
    private DefaultCamelCatalog api;

    @BeforeEach
    void setUp() {
        this.api = new DefaultCamelCatalog();
    }

    @Test
    void sort_keys_using_the_catalog_index() throws Exception {
        var aggregateCatalogModel = (EipModel) api.model(Kind.eip, "aggregate");

        List<String> aggregateKeysFromCamelYAMLDsl = List.of("aggregateController", "aggregationRepository",
                "aggregationStrategy", "aggregationStrategyMethodAllowNull", "aggregationStrategyMethodName",
                "closeCorrelationKeyOnCompletion", "completeAllOnStop", "completionFromBatchConsumer",
                "completionInterval", "completionOnNewCorrelationGroup", "completionPredicate", "completionSize",
                "completionSizeExpression", "completionTimeout", "completionTimeoutCheckerInterval",
                "completionTimeoutExpression", "correlationExpression", "description", "disabled",
                "discardOnAggregationFailure", "discardOnCompletionTimeout", "eagerCheckCompletion", "executorService",
                "forceCompletionOnStop", "id", "ignoreInvalidCorrelationKeys", "optimisticLockRetryPolicy",
                "optimisticLocking", "parallelProcessing", "steps", "timeoutCheckerExecutorService");

        List<String> expected = List.of("id", "description", "disabled", "correlationExpression", "completionPredicate",
                "completionTimeoutExpression", "completionSizeExpression", "optimisticLockRetryPolicy",
                "parallelProcessing", "optimisticLocking", "executorService", "timeoutCheckerExecutorService",
                "aggregateController", "aggregationRepository", "aggregationStrategy", "aggregationStrategyMethodName",
                "aggregationStrategyMethodAllowNull", "completionSize", "completionInterval", "completionTimeout",
                "completionTimeoutCheckerInterval", "completionFromBatchConsumer", "completionOnNewCorrelationGroup",
                "eagerCheckCompletion", "ignoreInvalidCorrelationKeys", "closeCorrelationKeyOnCompletion",
                "discardOnCompletionTimeout", "discardOnAggregationFailure", "forceCompletionOnStop",
                "completeAllOnStop", "steps");

        Comparator<String> comparator = new CamelYamlDSLKeysComparator(aggregateCatalogModel.getOptions());

        List<String> result = aggregateKeysFromCamelYAMLDsl.stream().sorted(comparator).toList();

        assertEquals(result, expected);
    }

}
