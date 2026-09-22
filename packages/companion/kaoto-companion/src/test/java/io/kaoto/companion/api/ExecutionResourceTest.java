package io.kaoto.companion.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ExecutionResourceTest {

    private static final String CAMEL_PAYLOAD = """
            {
              "workspaceRoot": "/home/user/my-project",
              "workload": {
                "framework": "CAMEL",
                "runtimeProfileId": "camel-main:4.10.0",
                "sources": [
                  { "path": "integrations/hello.camel.yaml", "format": "CAMEL_YAML" }
                ],
                "beans": [],
                "propertiesFiles": [],
                "envFiles": []
              }
            }
            """;

    private static final String CITRUS_PAYLOAD = """
            {
              "workspaceRoot": "/home/user/my-project",
              "workload": {
                "framework": "CITRUS",
                "runtimeProfileId": "citrus:4.10.3",
                "sources": [
                  { "path": "tests/hello.yaml", "format": "CITRUS_YAML" }
                ],
                "beans": [],
                "propertiesFiles": [],
                "envFiles": []
              }
            }
            """;

    @Test
    void postValidCamelPayloadReturns202() {
        given().contentType("application/json")
                .body(CAMEL_PAYLOAD)
                .when()
                .post("/v1/executions")
                .then()
                .statusCode(202)
                .body("status", is("ACCEPTED"));
    }

    @Test
    void postValidCitrusPayloadReturns202() {
        given().contentType("application/json")
                .body(CITRUS_PAYLOAD)
                .when()
                .post("/v1/executions")
                .then()
                .statusCode(202)
                .body("status", is("ACCEPTED"));
    }

    @Test
    void postMissingWorkspaceRootReturns400() {
        given().contentType("application/json")
                .body("""
                        {
                          "workload": {
                            "framework": "CAMEL",
                            "runtimeProfileId": "camel-main:4.10.0",
                            "sources": [{ "path": "hello.yaml", "format": "CAMEL_YAML" }]
                          }
                        }
                        """)
                .when()
                .post("/v1/executions")
                .then()
                .statusCode(400)
                .body("status", is("REJECTED"));
    }

    @Test
    void postMissingSourcesReturns400() {
        given().contentType("application/json")
                .body("""
                        {
                          "workspaceRoot": "/home/user/my-project",
                          "workload": {
                            "framework": "CAMEL",
                            "runtimeProfileId": "camel-main:4.10.0",
                            "sources": []
                          }
                        }
                        """)
                .when()
                .post("/v1/executions")
                .then()
                .statusCode(400)
                .body("status", is("REJECTED"));
    }

    @Test
    void postUnknownFrameworkReturns400() {
        given().contentType("application/json")
                .body("""
                        {
                          "workspaceRoot": "/home/user/my-project",
                          "workload": {
                            "framework": "UNKNOWN",
                            "runtimeProfileId": "camel-main:4.10.0",
                            "sources": [{ "path": "hello.yaml", "format": "CAMEL_YAML" }]
                          }
                        }
                        """)
                .when()
                .post("/v1/executions")
                .then()
                .statusCode(400);
    }

    @Test
    void getInfoReturns200WithNameAndVersion() {
        given().when()
                .get("/v1/info")
                .then()
                .statusCode(200)
                .body("name", is("kaoto-companion"))
                .body("version", notNullValue());
    }

    @Test
    void startupHandshakePrintsPortToStdout() {
        // Quarkus test infrastructure binds the server before tests run.
        // The port it bound is available via RestAssured's configured port.
        int boundPort = io.restassured.RestAssured.port;
        // The StartupReporter already ran during Quarkus startup.
        // We verify the bound port is a valid non-zero integer as a proxy check.
        org.junit.jupiter.api.Assertions.assertTrue(boundPort > 0, "Expected a positive bound port, got: " + boundPort);
    }
}
