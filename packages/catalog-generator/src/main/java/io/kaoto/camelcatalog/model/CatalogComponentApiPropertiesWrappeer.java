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

public class CatalogComponentApiPropertiesWrappeer {

        private Map<String,ComponentModel.ApiOptionModel> properties = new HashMap<String,ComponentModel.ApiOptionModel>();

        public Map<String, ComponentModel.ApiOptionModel> getProperties() {
            return properties;
        }

        public void setProperties(Map<String, ComponentModel.ApiOptionModel> properties) {
            this.properties = properties;
        }

}
