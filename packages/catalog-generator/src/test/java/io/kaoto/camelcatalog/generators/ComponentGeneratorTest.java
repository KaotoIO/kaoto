package io.kaoto.camelcatalog.generators;

import com.fasterxml.jackson.databind.node.ObjectNode;
import io.kaoto.camelcatalog.TestLoggerHandler;
import io.kaoto.camelcatalog.maven.CamelCatalogVersionLoader;
import io.kaoto.camelcatalog.model.CatalogRuntime;
import org.apache.camel.catalog.CamelCatalog;
import org.apache.camel.catalog.DefaultCamelCatalog;
import org.apache.camel.catalog.quarkus.QuarkusRuntimeProvider;
import org.apache.camel.springboot.catalog.SpringBootRuntimeProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

public class ComponentGeneratorTest {
    // 4.8.0
    static String SINGLE_VERSION_REGEXP = "[\\w.]+";
    // 4.8.0 (CEQ "3.15.0")
    static String MULTI_VERSION_REGEXP = "[\\w.]+ \\(CEQ [\\w.]+\\)";

    ComponentGenerator componentGenerator;

    @BeforeEach
    void setUp() throws IOException {
        CamelCatalog camelCatalog = new DefaultCamelCatalog();

        componentGenerator = new ComponentGenerator(camelCatalog, CatalogRuntime.Main);
    }

    @Test
    void shouldContainAListOfComponents() {
        var componentsMap = componentGenerator.generate();

        assertTrue(componentsMap.containsKey("activemq"));
        assertTrue(componentsMap.containsKey("dataset"));
        assertTrue(componentsMap.containsKey("elasticsearch"));
        assertTrue(componentsMap.containsKey("file"));

        assertTrue(componentsMap.containsKey("https"));
        assertTrue(componentsMap.containsKey("langchain4j-chat"));

        assertTrue(componentsMap.containsKey("mongodb"));
        assertTrue(componentsMap.containsKey("telegram"));
        assertTrue(componentsMap.containsKey("timer"));
        assertTrue(componentsMap.containsKey("xslt"));
    }

    @Test
    void shouldGetComponentJSONSchema() {
        var componentsMap = componentGenerator.generate();

        var fileNode = componentsMap.get("file");
        assertTrue(fileNode.has("propertiesSchema"));

        var filePropertySchemaNode = fileNode.get("propertiesSchema");
        assertFalse(filePropertySchemaNode.has("definitions"));
        assertTrue(filePropertySchemaNode.has("properties"));
        assertTrue(filePropertySchemaNode.has("required"));
    }

    @Test
    void shouldFillSchemaInformation() {
        var componentsMap = componentGenerator.generate();

        var as2PropertySchemaNode = componentsMap.get("as2").withObject("propertiesSchema");
        assertTrue(as2PropertySchemaNode.has("$schema"));
        assertTrue(as2PropertySchemaNode.has("type"));
        assertEquals("http://json-schema.org/draft-07/schema#", as2PropertySchemaNode.get("$schema").asText());
        assertEquals("object", as2PropertySchemaNode.get("type").asText());
    }

    @Test
    void shouldFillRequiredPropertiesIfNeeded() {
        var componentsMap = componentGenerator.generate();

        var as2Node = componentsMap.get("as2");
        List<String> requiredProperties = new ArrayList<>();
        as2Node.withObject("propertiesSchema").withArray("required").elements()
                .forEachRemaining(node -> requiredProperties.add(node.asText()));

        assertTrue(requiredProperties.contains("apiName"));
        assertTrue(requiredProperties.contains("methodName"));
    }

    @Test
    void shouldFillGroupInformation() {
        var componentsMap = componentGenerator.generate();

        var as2Node = componentsMap.get("as2");
        var apiNamePropertyNode = as2Node.withObject("propertiesSchema")
                .withObject("properties").withObject("apiName");

        assertTrue(apiNamePropertyNode.has("$comment"));
        assertEquals("group:common", apiNamePropertyNode.get("$comment").asText());
    }

    @Test
    void shouldFillFormatInformation() {
        var componentsMap = componentGenerator.generate();

        var sftpNode = componentsMap.get("sftp");
        var separatorPropertyNode = sftpNode.withObject("propertiesSchema")
                .withObject("properties").withObject("separator");
        var keyPairPropertyNode = sftpNode.withObject("propertiesSchema")
                .withObject("properties").withObject("keyPair");

        assertTrue(separatorPropertyNode.has("format"));
        assertTrue(keyPairPropertyNode.has("format"));
        assertEquals("bean:org.apache.camel.component.file.remote.RemoteFileConfiguration.PathSeparator",
                separatorPropertyNode.get("format").asText());
        assertEquals("bean:java.security.KeyPair|password",
                keyPairPropertyNode.get("format").asText());
    }

    @Test
    void shouldFillDeprecatedInformation() {
        var componentsMap = componentGenerator.generate();

        var slackNode = componentsMap.get("slack");
        var channelPropertyNode = slackNode.withObject("propertiesSchema")
                .withObject("properties").withObject("channel");
        var usernamePropertyNode = slackNode.withObject("propertiesSchema")
                .withObject("properties").withObject("username");

        assertFalse(channelPropertyNode.has("deprecated"));
        assertTrue(usernamePropertyNode.has("deprecated"));
        assertTrue(usernamePropertyNode.get("deprecated").asBoolean());
    }

    @Test
    void shouldFillDefaultInformation() {
        var componentsMap = componentGenerator.generate();

        var activemqNode = componentsMap.get("activemq");
        var destinationTypePropertyNode = activemqNode.withObject("propertiesSchema")
                .withObject("properties").withObject("destinationType");
        var acknowledgementModeNamePropertyNode = activemqNode.withObject("propertiesSchema")
                .withObject("properties").withObject("acknowledgementModeName");
        var autoStartupPropertyNode = activemqNode.withObject("propertiesSchema")
                .withObject("properties").withObject("autoStartup");
        var priorityPropertyNode = activemqNode.withObject("propertiesSchema")
                .withObject("properties").withObject("priority");

        assertTrue(destinationTypePropertyNode.has("default"));
        assertEquals("queue", destinationTypePropertyNode.get("default").asText());
        assertTrue(acknowledgementModeNamePropertyNode.has("default"));
        assertEquals("AUTO_ACKNOWLEDGE", acknowledgementModeNamePropertyNode.get("default").asText());
        assertTrue(autoStartupPropertyNode.has("default"));
        assertTrue(autoStartupPropertyNode.get("default").asBoolean());
        assertTrue(priorityPropertyNode.has("default"));
        assertEquals(4, priorityPropertyNode.get("default").asInt());
    }

    @Test
    void shouldAppendCamelVersionForQuarkus() {
        CamelCatalog camelCatalog = new DefaultCamelCatalog();
        camelCatalog.setRuntimeProvider(new QuarkusRuntimeProvider());
        componentGenerator = new ComponentGenerator(camelCatalog, CatalogRuntime.Quarkus);
        var componentsMap = componentGenerator.generate();

        var logNode = componentsMap.get("log");
        var componentVersion = logNode.withObject("component").get("version").asText();


        assertTrue(Pattern.matches(MULTI_VERSION_REGEXP, componentVersion));
    }

    @Test
    void shouldNotAppendCamelVersionForMain() {
        var componentsMap = componentGenerator.generate();

        var logNode = componentsMap.get("log");
        var componentVersion = logNode.withObject("component").get("version").asText();

        assertTrue(Pattern.matches(SINGLE_VERSION_REGEXP, componentVersion));
    }

    @Test
    void shouldNotAppendCamelVersionForSpring() {
        CamelCatalog camelCatalog = new DefaultCamelCatalog();
        camelCatalog.setRuntimeProvider(new SpringBootRuntimeProvider());
        componentGenerator = new ComponentGenerator(camelCatalog, CatalogRuntime.SpringBoot);
        var componentsMap = componentGenerator.generate();

        var logNode = componentsMap.get("log");
        var componentVersion = logNode.withObject("component").get("version").asText();

        assertTrue(Pattern.matches(SINGLE_VERSION_REGEXP, componentVersion));
    }

    @Test
    void shouldSetRedHatProviderIfAvailable() {
        CamelCatalogVersionLoader camelCatalogVersionLoader = new CamelCatalogVersionLoader(CatalogRuntime.Main, false);
        boolean loaded = camelCatalogVersionLoader.loadCamelCatalog("4.8.5.redhat-00008");
        assertTrue(loaded, "The catalog version wasn't loaded");

        CamelCatalog camelCatalog = camelCatalogVersionLoader.getCamelCatalog();
        componentGenerator = new ComponentGenerator(camelCatalog, CatalogRuntime.Main);
        var componentsMap = componentGenerator.generate();

        var logNode = componentsMap.get("log");
        var componentProvider = logNode.withObject("component").get("provider").asText();

        assertEquals("Red Hat", componentProvider);
    }

    @Test
    void shouldNotSetRedHatProviderIfUnavailable() {
        CamelCatalogVersionLoader camelCatalogVersionLoader = new CamelCatalogVersionLoader(CatalogRuntime.Main, false);
        boolean loaded = camelCatalogVersionLoader.loadCamelCatalog("4.8.5");
        assertTrue(loaded, "The catalog version wasn't loaded");

        CamelCatalog camelCatalog = camelCatalogVersionLoader.getCamelCatalog();
        componentGenerator = new ComponentGenerator(camelCatalog, CatalogRuntime.Main);
        var componentsMap = componentGenerator.generate();

        var logNode = componentsMap.get("log");
        var componentProvider = logNode.withObject("component").get("provider");

        assertNull(componentProvider);
    }

    @Test
    void shouldLogWarningAndReturnNullOnException() {
        TestLoggerHandler mockLoggerHandler = new TestLoggerHandler();
        Logger logger = Logger.getLogger(ComponentGenerator.class.getName());
        logger.setUseParentHandlers(false);
        logger.addHandler(mockLoggerHandler);

        ObjectNode result = componentGenerator.getComponentJson("invalidComponent");

        assertNull(result, "Expected null result for invalid component");
        assertTrue(mockLoggerHandler.getRecords().stream()
                .anyMatch(msg -> msg.getMessage().contains("invalidComponent: component definition not found in the catalog")),
                "Expected warning message not logged");
    }
}
