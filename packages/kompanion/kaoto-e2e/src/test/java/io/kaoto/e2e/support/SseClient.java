package io.kaoto.e2e.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Predicate;
import java.util.stream.Stream;

/** Minimal SSE subscriber that records every event it receives: the data: payload, and its id: when it has one. */
public class SseClient implements AutoCloseable {

    private volatile Stream<String> body;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final List<JsonNode> events = new CopyOnWriteArrayList<>();
    // the id of each event, in the order of events (null when it has none)
    private final List<String> ids = new CopyOnWriteArrayList<>();
    private volatile boolean completed;
    private volatile Throwable failure;
    private Thread reader;

    public static SseClient subscribe(String url) throws Exception {
        var client = new SseClient();
        var req = HttpRequest.newBuilder(URI.create(url))
                .header("Accept", "text/event-stream")
                .GET()
                .build();
        HttpResponse<Stream<String>> resp = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofLines());
        if (resp.statusCode() != 200) {
            resp.body().close();
            throw new IllegalStateException("SSE subscribe to " + url + " returned " + resp.statusCode());
        }
        client.body = resp.body();
        client.reader = Thread.ofVirtual().start(() -> {
            try (Stream<String> lines = resp.body()) {
                // an event is its id: and data: lines, ended by an empty line; several data: lines join with \n
                String[] id = {null};
                StringBuilder[] data = {null};
                lines.forEach(line -> {
                    if (line.isEmpty()) {
                        if (data[0] != null) {
                            try {
                                JsonNode event = MAPPER.readTree(data[0].toString());
                                client.ids.add(id[0]);
                                client.events.add(event);
                            } catch (Exception e) {
                                // ignore non-JSON payloads
                            }
                        }
                        id[0] = null;
                        data[0] = null;
                    } else if (line.startsWith("id:")) {
                        id[0] = line.substring(3).trim();
                    } else if (line.startsWith("data:")) {
                        String value = line.substring(5).trim();
                        data[0] = data[0] == null
                                ? new StringBuilder(value)
                                : data[0].append('\n').append(value);
                    }
                });
                client.completed = true;
            } catch (Throwable t) {
                client.failure = t;
            }
        });
        return client;
    }

    public List<JsonNode> events() {
        return events;
    }

    /** The id of each event received, in the same order as {@link #events()}; null for an event without one. */
    public List<String> ids() {
        return ids;
    }

    public boolean isCompleted() {
        return completed;
    }

    public Throwable failure() {
        return failure;
    }

    public JsonNode await(Predicate<JsonNode> predicate, Duration timeout) throws InterruptedException {
        Instant deadline = Instant.now().plus(timeout);
        while (Instant.now().isBefore(deadline)) {
            for (JsonNode e : events) {
                if (predicate.test(e)) {
                    return e;
                }
            }
            Thread.sleep(50);
        }
        return null;
    }

    @Override
    public void close() {
        // closing the body ends the HTTP stream, so the Kompanion sees the client go
        if (body != null) {
            body.close();
        }
        if (reader != null) {
            reader.interrupt();
        }
    }
}
