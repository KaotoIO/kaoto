/*
 * Copyright (C) 2024 Red Hat, Inc.
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
package io.kaoto.camelcatalog.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.camel.tooling.model.ApiMethodModel;

public class CatalogComponentApiWrapper {

private String name;
    private String description;
    private boolean consumerOnly;
    private boolean producerOnly;
    private final List<String> aliases = new ArrayList<>();
    private final Map<String,ApiMethodModel> methods = new HashMap<String,ApiMethodModel>();
    
    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }
    public String getDescription() {
        return description;
    }
    public void setDescription(String description) {
        this.description = description;
    }
    public boolean isConsumerOnly() {
        return consumerOnly;
    }
    public void setConsumerOnly(boolean consumerOnly) {
        this.consumerOnly = consumerOnly;
    }
    public boolean isProducerOnly() {
        return producerOnly;
    }
    public void setProducerOnly(boolean producerOnly) {
        this.producerOnly = producerOnly;
    }
    public List<String> getAliases() {
        return aliases;
    }
    public Map<String, ApiMethodModel> getMethods() {
        return methods;
    }

}
