package io.kaoto.camelcatalog.generators;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import io.fabric8.kubernetes.api.model.apiextensions.v1.CustomResourceDefinition;
import io.kaoto.camelcatalog.generator.Util;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

public class CRDGenerator {
    private static final Logger LOGGER = Logger.getLogger(CRDGenerator.class.getName());
    private static final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
    private final List<String> camelKCRDs;

    public CRDGenerator(List<String> camelKCRDs) {
        this.camelKCRDs = camelKCRDs;
    }

    public Map<String, String> generate() {
        var answer = new LinkedHashMap<String, String>();

        camelKCRDs.forEach(crdString -> {
            try {
                var crd = yamlMapper.readValue(crdString, CustomResourceDefinition.class);
                var schema = crd.getSpec().getVersions().get(0).getSchema().getOpenAPIV3Schema();
                var name = crd.getSpec().getNames().getKind();

                answer.put(name, Util.getPrettyJSON(schema));
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, e.toString(), e);
            }
        });

        return answer;
    }
}
