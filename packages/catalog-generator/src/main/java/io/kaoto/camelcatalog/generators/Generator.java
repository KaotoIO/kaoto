package io.kaoto.camelcatalog.generators;

import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.Map;

public interface Generator {
    Map<String, ObjectNode> generate();
}
