# Conversation Context Engine

## Existing request flow

Before the context engine, `modules::chat::service::ChatService::send_message`
validated and persisted the user message, loaded up to 100 conversation messages
from `modules::conversation::db`, passed those messages directly to an
`LlmRequest`, streamed the provider response, and persisted the assistant
message. The provider implementations only translate an already-built request
to their HTTP APIs. Plan mode is represented by the system instruction and the
hidden plan-options block in the assistant response; there is no separate plan
database.

## Current request flow

The service still owns conversation persistence and streaming, but now asks
`ContextManager` to assemble the provider request after the user message is
persisted. The context engine owns token estimation, model capability fallbacks,
recent atomic message selection, bounded keyword retrieval, durable continuation
state, and pre-generation compaction. Providers remain unaware of conversation
selection.

```text
persist user message
        ↓
ContextManager
  ├─ provider-aware token budget
  ├─ continuation state and snapshot
  ├─ bounded relevant-history retrieval
  ├─ pre-stream compaction when threshold is reached
  └─ recent verbatim messages
        ↓
assembled LlmRequest
        ↓
provider streaming
        ↓
persist assistant response
```

The conversation tables remain the source of truth. Context snapshots only
describe a compacted working set and never delete or rewrite conversation
messages. Retrieval and compaction failures degrade to the bounded recent
window, while database failures remain actionable errors.
