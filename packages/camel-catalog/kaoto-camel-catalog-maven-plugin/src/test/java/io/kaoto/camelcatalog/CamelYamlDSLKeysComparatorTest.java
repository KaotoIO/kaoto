package io.kaoto.camelcatalog;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Comparator;
import java.util.List;

import org.apache.camel.catalog.DefaultCamelCatalog;
import org.apache.camel.tooling.model.EipModel;
import org.apache.camel.tooling.model.Kind;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class CamelYamlDSLKeysComparatorTest {
    private DefaultCamelCatalog api;

    @BeforeEach
    public void setUp() {
        this.api = new DefaultCamelCatalog();
    }

    @Test
    public void sort_keys_using_the_catalog_index() throws Exception {
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
