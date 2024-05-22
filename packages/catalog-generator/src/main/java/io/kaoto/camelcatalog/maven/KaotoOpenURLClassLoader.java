/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.kaoto.camelcatalog.maven;

import java.net.URL;
import java.net.URLClassLoader;

/**
 * This class is a copy of the OpenURLClassLoader class from the Apache Camel
 * Catalog project.
 *
 * This is a workaround because the original class is package private
 */
class KaotoOpenURLClassLoader extends URLClassLoader {

    public KaotoOpenURLClassLoader() {
        super(new URL[0]);
    }

    @Override
    public void addURL(URL url) {
        super.addURL(url);
    }

}
