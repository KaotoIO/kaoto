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

import java.util.HashMap;
import java.util.Map;

import org.apache.camel.tooling.model.ComponentModel;
import org.apache.camel.tooling.model.ComponentModel.ComponentOptionModel;
import org.apache.camel.tooling.model.ComponentModel.EndpointHeaderModel;
import org.apache.camel.tooling.model.ComponentModel.EndpointOptionModel;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CatalogComponentWrapper {

    private ComponentModel component;
    private Map<String,EndpointHeaderModel> headers = new HashMap<String,EndpointHeaderModel>();
    @JsonProperty("componentProperties") private Map<String,ComponentOptionModel> componentOptions = new HashMap<String,ComponentOptionModel>();
    @JsonProperty("properties") private Map<String,EndpointOptionModel> endpointOptions = new HashMap<String,EndpointOptionModel>();
    @JsonProperty("apiProperties") private Map<String,CatalogComponentApiMethodsWrapper> apiOptions = new HashMap<String,CatalogComponentApiMethodsWrapper>();
    
    public Map<String, CatalogComponentApiMethodsWrapper> getApiOptions() {
        return apiOptions;
    }
    public void setApiOptions(Map<String, CatalogComponentApiMethodsWrapper> apiOptions) {
        this.apiOptions = apiOptions;
    }
    private Map<String,CatalogComponentApiWrapper> apis = new HashMap<String,CatalogComponentApiWrapper>();


    public Map<String, CatalogComponentApiWrapper> getApis() {
        return apis;
    }
    public void setApis(Map<String, CatalogComponentApiWrapper> apis) {
        this.apis = apis;
    }
    public ComponentModel getComponent() {
        return component;
    }
    public void setComponent(ComponentModel component) {
        this.component = component;
    }
    public Map<String, EndpointHeaderModel> getHeaders() {
        return headers;
    }
    public void setHeaders(Map<String, EndpointHeaderModel> headers) {
        this.headers = headers;
    }
    public Map<String, ComponentOptionModel> getComponentOptions() {
        return componentOptions;
    }
    public void setComponentOptions(Map<String, ComponentOptionModel> componentProperties) {
        this.componentOptions = componentProperties;
    }
    public Map<String, EndpointOptionModel> getEndpointOptions() {
        return endpointOptions;
    }
    public void setEndpointOptions(Map<String, EndpointOptionModel> properties) {
        this.endpointOptions = properties;
    }
}