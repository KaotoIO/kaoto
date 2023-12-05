import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import io.kaoto.camelcatalog.KameletProcessor;
import org.junit.jupiter.api.Test;

import java.util.Iterator;

import static org.junit.jupiter.api.Assertions.*;

public class KameletProcessorTest {
    private final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());;

    private ObjectNode processKamelet(String name) throws Exception {
        var is = Thread.currentThread().getContextClassLoader().getResourceAsStream("kamelets/" + name + ".kamelet.yaml");
        var kamelet = (ObjectNode) yamlMapper.readTree(is);
        KameletProcessor.process(kamelet);
        return kamelet;
    }

    @Test
    public void test() throws Exception {
        var beerSource = processKamelet("beer-source");
        assertTrue(beerSource.has("propertiesSchema"));
        var periodProp = beerSource.withObject("/propertiesSchema")
                .withObject("/properties")
                .withObject("/period");
        assertEquals("integer", periodProp.get("type").asText());
        assertEquals(5000, periodProp.get("default").asInt());
        var googleStorageSink = processKamelet("google-storage-sink");
        var serviceAccountKeyProp = googleStorageSink.withObject("/propertiesSchema")
                .withObject("/properties")
                .withObject("/serviceAccountKey");
        assertEquals("string", serviceAccountKeyProp.get("type").asText());
        assertEquals("Service Account Key", serviceAccountKeyProp.get("title").asText());
        var awsCloudwatchSink = processKamelet("aws-cloudwatch-sink");
        var accessKeyProp = awsCloudwatchSink.withObject("/propertiesSchema")
                .withObject("/properties")
                .withObject("/accessKey");
        assertEquals("string", accessKeyProp.get("type").asText());
        assertEquals("password", accessKeyProp.get("format").asText());
        var regionProp = awsCloudwatchSink.withObject("/propertiesSchema")
                .withObject("/properties")
                .withObject("/region");
        assertEquals("string", regionProp.get("type").asText());
        var regionEnum = regionProp.withArray("/enum");
        for (Iterator<JsonNode> it = regionEnum.elements(); it.hasNext(); ) {
            var region = it.next();
            if ("us-west-1".equals(region.asText())) return;
        }
        fail("us-west-1 not found in region enum");
    }
}
