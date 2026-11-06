# Send a test message

Before starting the integration, give the route an explicit `route.id` and save the file. For example:

```yaml
- route:
    id: send-message-test
    from:
      uri: direct:send-message-test
      steps:
        - log:
            message: 'Received: ${body}'
```

Kaoto does not automatically save the file when launching an integration. Send Message matches the saved file path and route ID against the running deployment. Without a saved ID, Camel can assign a runtime ID different from the one generated in the editor; the Deployments view can then show a started route while Send Message remains disabled. If the integration was started without the saved ID, add the ID, save the file, and restart the integration. Saving alone does not reliably update the identity of an already-running route.

Start your integration using Kaoto and wait until the route appears as **Started** in the Deployments view. At the route's first node, choose **Send test message**. A disabled button with the tooltip **Start this route to send a test message** means that no matching started local deployment is available.

Compose a text or file payload and headers in the dialog, then select **Send**. With one matching instance, the target is selected automatically. If the same route is running in multiple instances, select the target runtime explicitly; its name and PID identify it. Sending to an intermediate processor is not supported.

The extension uses your configured executor: Camel CLI through JBang or Camel Launcher. There is no separate executor selection in the dialog. The feature only uses local deployments recognized by Kaoto and does not start a runtime automatically. A future Kompanion integration requires reassessment of discovery, target selection and delivery.

Delivery errors keep the dialog open and preserve your inputs. If a selected runtime stops or is replaced, select an available target before retrying. The runtime must expose a supported way to resolve its JVM PID; the extension uses its JVM developer console or the Jolokia Runtime/Pid endpoint on the known management port.

## Payload behavior

Text is supplied as a String; file payloads retain their bytes and are supplied using Camel's file-body mechanism. Temporary argument files allow large text messages without placing the full message in process arguments. Temporary message files are removed after the send attempt. Text and headers containing control characters other than backspace, tab, newline, form feed or carriage return are rejected because the CLI argument-file parser cannot preserve them. Use a file payload for such content.

**Known limitation:** Camel interprets text starting with `file:` as a file reference. For example, `file:/path/to/payload.txt` sends the readable file's contents rather than that literal text. Missing or unreadable files may cause a delivery error. This initial integration adds no special validation or escaping for this prefix, for either executor.

A started route does not guarantee that its input endpoint supports sending. Endpoint-specific delivery errors are shown in the dialog.
