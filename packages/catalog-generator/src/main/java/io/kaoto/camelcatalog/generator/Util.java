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
package io.kaoto.camelcatalog.generator;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.apache.commons.io.FilenameUtils;

public class Util {
    public static String generateHash(byte[] content) throws Exception {
        if (content == null)
            return null;
        var digest = java.security.MessageDigest.getInstance("MD5");
        var hash = digest.digest(content);
        return new java.math.BigInteger(1, hash).toString(16);
    }

    public static String generateHash(Path path) throws Exception {
        return path == null ? null : generateHash(Files.readAllBytes(path));
    }

    public static String generateHash(String content) throws Exception {
        return content == null ? null : generateHash(content.getBytes());
    }

    public static String getNormalizedFolder(String folder) {
        // Get the current working directory
        Path currentDirectory = Paths.get("").toAbsolutePath();

        // Resolve the relative path
        Path absolutePath = currentDirectory.resolve(folder);
        String normalizedfolder = FilenameUtils.separatorsToUnix(absolutePath.toString());

        return normalizedfolder;
    }
}
