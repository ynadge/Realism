# Sapiom API Feedback

> Each entry documents a friction point, unexpected behavior, or inefficiency encountered while using Sapiom's unified capability stack in a real agentic application.

---

## Audio / ElevenLabs

### 1. TTS proxy returns JSON instead of raw audio binary

- **What happened:** `sapiomTextToSpeech` called `POST /v1/text-to-speech/{voiceId}` on the ElevenLabs proxy and invoked `res.arrayBuffer()` on the response, expecting raw MP3 data (the native ElevenLabs behavior).
- **Expected behavior:** Raw audio binary response (same as the upstream ElevenLabs API), or clear documentation that the response format differs.
- **Actual behavior:** The proxy returns `200 OK` with `Content-Type: application/json` and a body like:
  ```json
  {"url":"/audio/audio/xxx-tts-xxx.mp3","expiresAt":"2026-02-27T10:53:33.263Z"}
  ```
  The 127-byte JSON body was silently treated as audio data. No error was thrown since the status was 200.
- **Impact:** High — silent data corruption. Produced a 127-byte "audio file" that appeared valid to the code but was not playable. Required a full end-to-end test cycle to discover. ~1 hour of debugging.
- **Workaround:** Rewrote `sapiomTextToSpeech` to parse JSON, extract the URL, and prepend the service base URL.
- **Suggestion:** Either preserve the upstream binary response format, or document the JSON wrapper prominently on the audio capabilities page. A `Content-Type: audio/mpeg` vs `application/json` check would have caught this instantly if the format change were documented.
- **Doc source:** [Audio Services](https://docs.sapiom.ai/capabilities/audio/) — this page **explicitly documents the opposite behavior**. The TTS Response section states: *"The response is binary audio data with the appropriate Content-Type header"* and lists `audio/mpeg` for MP3. Both the Quick Example and Complete Example call `response.arrayBuffer()` and write the result with `Buffer.from(buffer)`. The documentation actively instructs you to treat the response as binary audio — but the actual Sapiom proxy returns `Content-Type: application/json` with a JSON body. This isn't a missing doc; it's a directly contradictory doc.

### 2. TTS response contains a relative URL

- **What happened:** The `url` field in the TTS JSON response is a relative path (`/audio/audio/xxx.mp3`), not an absolute URL.
- **Expected behavior:** An absolute URL (`https://elevenlabs.services.sapiom.ai/audio/audio/xxx.mp3`) that can be used directly.
- **Actual behavior:** Relative path requiring manual base URL construction.
- **Impact:** Low — easy to fix, but unexpected. Every other Sapiom service (FAL images, search results) returns absolute URLs.
- **Workaround:** Prepend `https://elevenlabs.services.sapiom.ai` if the URL doesn't start with `http`.
- **Suggestion:** Return absolute URLs for consistency with all other Sapiom service responses.
- **Doc source:** [Audio Services](https://docs.sapiom.ai/capabilities/audio/) — since the TTS docs explicitly document binary audio responses (see issue #1), no JSON response schema exists at all. The `url` field with its relative path is entirely undiscoverable from the documentation. Compare with [Generate Images](https://docs.sapiom.ai/capabilities/images/), whose response example shows absolute URLs (`"url": "https://fal.media/files/abc123.jpg"`), setting the cross-service expectation that Sapiom proxies return absolute URLs.

---

## AI Models / OpenRouter

### 3. Proxy rejects valid `content: null` on assistant messages with tool_calls

- **What happened:** During the agentic loop, the orchestrator sent conversation history to the OpenRouter proxy. Assistant messages that contained `tool_calls` had `content: null` (standard behavior — Claude returns null content when it only makes tool calls).
- **Expected behavior:** The proxy accepts `content: null` on assistant messages per the OpenAI API specification, which explicitly allows this.
- **Actual behavior:** The proxy returned:
  ```json
  {"message":["messages.8.content should not be empty"],"error":"Bad Request","statusCode":400}
  ```
- **Impact:** High — broke the entire agentic tool-calling flow. Only appeared on the second LLM iteration (when enough tool results accumulated to create a message at index 8+). ~45 minutes to diagnose because the error message referenced a message index rather than explaining the validation rule.
- **Workaround:** Set `content: 'Calling tools.'` on assistant messages when `content` would otherwise be null.
- **Suggestion:** Remove this validation. `content: null` on assistant messages with `tool_calls` is valid per the OpenAI chat completions spec and is standard behavior from Anthropic models.
- **Doc source:** [AI Model Access](https://docs.sapiom.ai/capabilities/ai-models/) — this page states: *"The API is OpenAI-compatible"* and lists *"Function/tool calling (on supported models)"* as a supported feature. The "Common Issues" section only covers missing `max_tokens` and model naming. No proxy-specific validation rules are documented — in particular, no mention that the proxy rejects `content: null` on assistant messages, which is valid per the OpenAI spec and standard behavior from Anthropic models during tool-calling. The Error Codes table lists 400, 402, 404, 429 but does not describe what triggers a 400 in tool-calling scenarios.

### 4. Transient 500 errors with no retry guidance

- **What happened:** The OpenRouter proxy returned `{"statusCode":500,"message":"Internal server error"}` during a DC4 test run, mid-orchestration.
- **Expected behavior:** Either higher reliability, or standard retry guidance (`Retry-After` header, error code indicating transient vs permanent failure).
- **Actual behavior:** Generic 500 with no headers or detail. No way to distinguish "try again in 2 seconds" from "this request will never work."
- **Impact:** Medium — required adding custom retry logic (3 attempts, exponential backoff) to the orchestrator.
- **Workaround:** Added retry loop with 2s/4s/6s backoff for 500+ status codes.
- **Suggestion:** Include a `Retry-After` header on transient failures, or return a structured error with a `retryable: true` field.
- **Doc source:** [AI Model Access](https://docs.sapiom.ai/capabilities/ai-models/) — the Error Codes table lists 400, 402, 404, 429 only. No 500-level errors are documented, and no retry strategy is described. [API Introduction](https://docs.sapiom.ai/api-reference/introduction/) — documents rate limiting (1000 req/min) and a generic error response format, but contains no guidance on transient failures, retry strategies, or `Retry-After` headers. Neither page acknowledges that 500 errors can occur or how to handle them.

---

## Data / Redis

### 5. Path-based Redis commands hit URL length limits with opaque errors

- **What happened:** Redis commands were sent as path-encoded URLs (`POST /set/{key}/{urlEncodedValue}/EX/{ttl}`). When storing a job object with embedded artifact data, the URL-encoded value exceeded server URL length limits.
- **Expected behavior:** Either a clear error message explaining the URL length issue, or the path-based API gracefully handling large values.
- **Actual behavior:** The proxy returned:
  ```json
  {"error":"upstream_400","provider":"upstash-redis","message":"400 Bad Request"}
  ```
  No indication that URL length was the problem. No suggestion to use the pipeline endpoint.
- **Impact:** High — ~1 hour of debugging. Had to manually reason through URL encoding and value sizes to identify the root cause.
- **Workaround:** Rewrote the entire Redis transport layer to use `POST /pipeline` with JSON body instead of path-encoded commands.
- **Suggestion:** (a) Include the actual upstream error detail in the proxy response. (b) Add a specific error for URL-too-long conditions. (c) Consider recommending pipeline as the default approach in docs.
- **Doc source:** [Data](https://docs.sapiom.ai/capabilities/data/) — the page's Quick Example and Complete Example both use path-based commands (`/set/my-key/my-value`, `/set/session:abc/active`). Pipeline IS documented in the "Redis Data Plane" section as a third code example, but is presented as a batching optimization, not as a solution for large values. No warning about URL length limits appears anywhere on the page. A developer following the primary examples will use path-based commands and only discover the size limitation at runtime with an opaque `upstream_400` error.

### 6. Documentation emphasizes path-based commands over pipeline

- **What happened:** The Redis data capability docs primarily show path-based examples (`/set/key/value`). The pipeline endpoint (`POST /pipeline` with `[["SET","key","value"]]` body) is mentioned once in passing.
- **Expected behavior:** For a data service meant to store structured application state (JSON objects, session data), the docs should lead with or at least equally emphasize the body-based pipeline approach.
- **Actual behavior:** A developer following the docs will naturally use path-based commands, which break as soon as values exceed a few KB.
- **Impact:** Medium — every application that stores real JSON (not just tiny strings) will hit this wall.
- **Suggestion:** Make pipeline the recommended approach in the quick start examples, or add a prominent warning about URL length limits on the path-based examples.
- **Doc source:** [Data](https://docs.sapiom.ai/capabilities/data/) — pipeline IS documented on this page in the "Redis Data Plane" section (`POST ${db.url}/pipeline` with `[["set","key1","value1"],...]`), but it appears as the third of three code examples, positioned as a way to batch multiple commands. The Quick Example, Complete Example, and the first two Redis Data Plane examples all use path-based commands. There is no note that pipeline is essential (not optional) when storing values larger than a few KB, and no warning about the URL encoding size limit on path-based commands.

### 7. `@upstash/redis` client library is incompatible

- **What happened:** Sapiom provides access to Upstash Redis, but the standard `@upstash/redis` npm package cannot be used because authentication goes through x402 (via `@sapiom/fetch`) rather than Upstash's native REST token.
- **Expected behavior:** Either compatibility with the official Upstash client (perhaps by providing a compatible token), or a Sapiom-specific Redis client with typed methods.
- **Actual behavior:** You must abandon the Upstash client and write raw HTTP commands through `@sapiom/fetch`, losing all typed methods, automatic serialization, pipeline helpers, and the general developer experience of `@upstash/redis`.
- **Impact:** Medium — ongoing overhead throughout the project. Every Redis operation in `lib/redis.ts` is manual HTTP. Simple operations like `SET`, `GET`, `RPUSH` required custom wrapper functions.
- **Suggestion:** Either provide a `@sapiom/redis` package that wraps `@upstash/redis` with x402 auth, or expose a compatible REST token so the official client can be used directly.
- **Doc source:** [Data](https://docs.sapiom.ai/capabilities/data/) — the page states *"interact with Redis entirely over REST — no TCP connections or Redis client libraries needed"*, which hints that native clients aren't the intended path but is ambiguous — "not needed" is not the same as "will not work." The page names Upstash as the provider and links to the [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi), making it natural to reach for `@upstash/redis`. The actual incompatibility (x402 auth vs Upstash REST tokens) is never stated. [@sapiom/fetch](https://docs.sapiom.ai/reference/sdk/fetch/) — explains the x402 payment flow but does not mention that this payment mechanism makes native provider client libraries incompatible. [How Sapiom Works](https://docs.sapiom.ai/how-it-works/) — describes the x402 gateway architecture but does not call out that only raw HTTP through the SDK works, not provider-specific client libraries.

---

## Governance / Spending Rules

### 8. Governance API uses Bearer auth instead of x402

- **What happened:** Called `POST https://api.sapiom.ai/v1/spending-rules` through `@sapiom/fetch` (which handles x402). The request was rejected with `401 Unauthorized`.
- **Expected behavior:** Consistent auth across all Sapiom endpoints, or clear documentation of the exception.
- **Actual behavior:** The governance API at `api.sapiom.ai` requires `Authorization: Bearer {apiKey}`, while every service endpoint uses x402 via the SDK. The docs page says "No authentication required" (inaccurate), while the curl example shows Bearer auth (correct).
- **Impact:** Medium — ~30 minutes to diagnose. Required falling back to raw `fetch` with manual headers, creating a split where some Sapiom calls use the SDK and others don't.
- **Workaround:** Used raw `fetch` with `Authorization: Bearer` for governance endpoints.
- **Suggestion:** Either route governance through x402 for consistency, or document the auth difference prominently and provide a helper in the SDK.
- **Doc source:** [Create a new rule](https://docs.sapiom.ai/api-reference/endpoints/rules/v1-spending-rules-post/) — this single page contains **three contradictory auth statements**: (1) the description says *"Supports both JWT and API key authentication"*, (2) the Authentication section says *"No authentication required"*, and (3) the curl example includes `-H "Authorization: Bearer YOUR_API_KEY"`. The error table also lists `401 Unauthorized`, confirming auth IS required. In practice, Bearer auth is required — the "No authentication required" label is incorrect. [How Sapiom Works](https://docs.sapiom.ai/how-it-works/) — describes x402 as the universal auth mechanism (*"The SDK wraps your HTTP client and attaches payment headers to every request"*), with no mention that the governance REST API at `api.sapiom.ai` uses Bearer auth instead. [API Introduction](https://docs.sapiom.ai/api-reference/introduction/) — correctly states *"All API endpoints are authenticated using Bearer tokens"* for the management API, but the distinction between the management API (`api.sapiom.ai`) and service proxies (`*.services.sapiom.ai`) is never made explicit.

### 9. Spending rule schema has undocumented constraints

- **What happened:** After fixing auth, the spending rule creation still failed with 400 because:
  - `fieldType: 'agent'` is not a valid value (valid: `service, action, resource, qualifier, transaction_property, payment_property`)
  - `measurementType: 'sum_cost'` is not a valid value (valid: `count_transactions, sum_payment_amount, this_payment_amount, sum_transaction_costs, this_transaction_cost`)
- **Expected behavior:** Either a simpler API for common use cases (e.g., "limit this agent to $X"), or clear documentation of all valid enum values.
- **Actual behavior:** The enum values are only discoverable through 400 error responses. There's no `agent` fieldType for conditions, though the `agentIds` top-level field (present in the example but easy to miss) can scope a rule to specific agents. The valid `measurementType` for dollar-based limits (`sum_payment_amount`) isn't shown in any example.
- **Impact:** Low — made spending rules non-fatal since the orchestrator enforces budget in its own loop.
- **Workaround:** Made spending rule creation best-effort (non-blocking). Budget enforcement handled in the orchestrator's iteration loop.
- **Suggestion:** (a) List valid enum values in the API reference. (b) Consider adding an `agent` fieldType for agent-scoped rules. (c) Provide a simplified "budget cap" endpoint for the most common case.
- **Doc source:** [Create a new rule](https://docs.sapiom.ai/api-reference/endpoints/rules/v1-spending-rules-post/) — the request body example shows `fieldType: "service"` and `measurementType: "count_transactions"`, but these are the only values shown. No schema or enum list is provided for `fieldType` (valid: `service, action, resource, qualifier, transaction_property, payment_property`), `measurementType` (valid: `count_transactions, sum_payment_amount, this_payment_amount, sum_transaction_costs, this_transaction_cost`), or `operator`. We needed `sum_payment_amount` for dollar-based budget caps, but the example only shows `count_transactions` for call counting — discovering the dollar-amount measurement type required a 400 error response. Note: the example does show an `agentIds` field for scoping rules to specific agents, which we initially missed; agent scoping via `agentIds` IS possible, just not via `fieldType` conditions. [Setting Up Rules](https://docs.sapiom.ai/governance/rules/) — describes spend limits and usage limits conceptually (per-run, daily, weekly, monthly) but provides no API-level parameter examples or valid enum values.

---

## Messaging / QStash

### 10. QStash schedules endpoint is undocumented

- **What happened:** Persistent jobs require creating a recurring cron schedule via QStash. The `sapiomScheduleJob` function needed to call `POST /v1/qstash/schedules/{destination}` with an `Upstash-Cron` header to create a schedule. This endpoint is part of the standard QStash API but is not listed in the Sapiom Messaging documentation.
- **Expected behavior:** The Messaging capability page documents all available QStash operations, including schedules (create, list, delete).
- **Actual behavior:** The page only documents three endpoints: `publish`, `enqueue`, and `batch`. Schedules work (the proxy forwards to QStash correctly) but are completely undocumented. Additionally, the Publish section's "Rules" note says *"Callback, cron, and flow-control headers are stripped before forwarding"* — which creates ambiguity about whether cron-based scheduling is supported at all.
- **Impact:** Medium — required inferring the endpoint from the native QStash API docs and hoping the Sapiom proxy forwards it. The "cron headers are stripped" note actively discouraged the correct approach. ~30 minutes of analysis to determine the right path.
- **Workaround:** Used the undocumented `POST /v1/qstash/schedules/{destination}` path with `Upstash-Cron` header — it works because the proxy maps all `/v1/qstash/*` paths to QStash.
- **Suggestion:** (a) Add schedules (create, list, get, delete) to the Messaging capability page. (b) Clarify that "cron headers are stripped before forwarding" means stripped from the delivery to the destination (not from QStash processing). (c) Show a schedule example since recurring jobs are a primary QStash use case.
- **Doc source:** [Messaging](https://docs.sapiom.ai/capabilities/messaging/) — the endpoint table lists only `publish/*destination`, `enqueue/:queueName/*destination`, and `batch`. No mention of `schedules/*destination` or `schedules/:scheduleId`. The Rules section under Publish states: *"Callback, cron, and flow-control headers are stripped before forwarding"* — this suggests cron headers are discarded, when in reality they're processed by QStash and only stripped from the forwarded delivery to the destination.

