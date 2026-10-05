package io.kaoto.kompanion.worker;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * What the camel-cli-connector of a given Camel version can do. Taken from the action dispatcher of
 * {@code dsl/camel-cli-connector} (LocalCliConnector) on the released tags, not guessed: update it from the sources
 * when a Camel release adds actions.
 */
public final class ConnectorActions {

    /** Actions of 4.18 up to 4.20. */
    private static final Set<String> ACTIONS_4_18 = Set.of(
            "route",
            "processor",
            "logger",
            "gc",
            "eval",
            "load",
            "reload",
            "debug",
            "reset-stats",
            "thread-dump",
            "top-processors",
            "source",
            "route-dump",
            "route-structure",
            "route-controller",
            "startup-recorder",
            "stub",
            "send",
            "transform",
            "bean",
            "kafka",
            "trace",
            "browse",
            "receive",
            "cli-debug");

    /** Actions added by 4.21. */
    private static final Set<String> ACTIONS_4_21 =
            union(ACTIONS_4_18, Set.of("jvm", "rest-spec", "route-topology", "span", "readme"));

    /** Actions added by 4.22 (unchanged on 4.23). */
    private static final Set<String> ACTIONS_4_22 = union(
            ACTIONS_4_21,
            Set.of(
                    "heap-histogram",
                    "processor-detail",
                    "sql-query",
                    "sql-update-row",
                    "heap-dump",
                    "jfr-memory-leak",
                    "jfr",
                    "spring-boot-configuration",
                    "type-converters",
                    "transformers",
                    "vault-refresh"));

    /**
     * Actions that never write an output file: on the file transport they are done once the action file is deleted, and
     * their failures are only logged by the app.
     */
    private static final Set<String> NO_OUTPUT =
            Set.of("route", "processor", "logger", "gc", "reload", "reset-stats", "cli-debug", "vault-refresh");

    private static final Pattern VERSION = Pattern.compile("^(\\d+)\\.(\\d+)");

    private final int major;
    private final int minor;

    private ConnectorActions(int major, int minor) {
        this.major = major;
        this.minor = minor;
    }

    /**
     * Returns the capabilities of the given Camel version (e.g. {@code 4.18.4}, {@code 4.23.0-SNAPSHOT},
     * {@code 4.18.0.redhat-00001}), or null when the version is unknown or cannot be parsed.
     */
    public static ConnectorActions of(String camelVersion) {
        if (camelVersion == null) {
            return null;
        }
        Matcher m = VERSION.matcher(camelVersion.trim());
        return m.find() ? new ConnectorActions(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2))) : null;
    }

    /** Whether the connector of this version knows the action. */
    public boolean supports(String action) {
        return actions().contains(action);
    }

    /** Whether the action writes an output file (see {@link #NO_OUTPUT}). */
    public static boolean writesOutput(String action) {
        return !NO_OUTPUT.contains(action);
    }

    /**
     * Whether the file transport takes one action file per request ({@code {pid}-action-{requestId}.json}), added in
     * 4.21. Older versions only have the single {@code {pid}-action.json} slot.
     */
    public boolean multiSlot() {
        return atLeast(4, 21);
    }

    /** Whether the send action decodes {@code bodyEncoding=base64}, added in 4.23. */
    public boolean bodyEncoding() {
        return atLeast(4, 23);
    }

    private Set<String> actions() {
        if (atLeast(4, 22)) {
            return ACTIONS_4_22;
        }
        return atLeast(4, 21) ? ACTIONS_4_21 : ACTIONS_4_18;
    }

    private boolean atLeast(int major, int minor) {
        return this.major > major || (this.major == major && this.minor >= minor);
    }

    private static Set<String> union(Set<String> a, Set<String> b) {
        var all = new HashSet<>(a);
        all.addAll(b);
        return Set.copyOf(all);
    }
}
