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

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.apache.camel.tooling.model.EipModel.EipOptionModel;

public class CamelYamlDSLKeysComparator implements Comparator<String> {

    private final List<EipOptionModel> eipOptions;

    public CamelYamlDSLKeysComparator(List<EipOptionModel> eipOptions) {
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
