package io.kaoto.camelcatalog;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.apache.camel.tooling.model.EipModel.EipOptionModel;

public class CamelYamlDSLKeysComparator implements Comparator<String> {

    private final List<EipOptionModel> eipOptions;

    CamelYamlDSLKeysComparator(List<EipOptionModel> eipOptions) {
        this.eipOptions = eipOptions;
    }

    @Override
    public int compare(String firstKey, String secondKey) {
        Optional<EipOptionModel> firstOption = eipOptions.stream().filter(e -> e.getName().equals(firstKey)).findFirst();
        Optional<EipOptionModel> secondOption = eipOptions.stream().filter(e -> e.getName().equals(secondKey)).findFirst();

        var firstIndex = firstOption.isPresent() ? firstOption.get().getIndex() : Integer.MAX_VALUE;
        var secondIndex = secondOption.isPresent() ? secondOption.get().getIndex() : Integer.MAX_VALUE;

        return Integer.compare(firstIndex, secondIndex);
    }
}
