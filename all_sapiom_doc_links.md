# Sapiom Documentation Links

All pages from [docs.sapiom.ai](https://docs.sapiom.ai/).

---

## Getting Started

- [Introduction to Sapiom](https://docs.sapiom.ai/) — Overview of Sapiom, available capabilities, and value proposition
- [How Sapiom Works](https://docs.sapiom.ai/how-it-works/) — Architecture and payment flow
- [Quick Start](https://docs.sapiom.ai/quick-start/) — Call a paid API in 3 steps
- [Using Services](https://docs.sapiom.ai/using-services/) — How to call services via the SDK
- [For AI Tools](https://docs.sapiom.ai/for-agents/) — Integration guidance for AI agents and tools

## Capabilities

- [Overview](https://docs.sapiom.ai/capabilities/) — Summary of all available capabilities
- [Verify Users](https://docs.sapiom.ai/capabilities/verify/) — Phone and email verification via Prelude
- [Search the Web](https://docs.sapiom.ai/capabilities/search/) — AI-powered web search via Linkup and You.com
- [AI Model Access](https://docs.sapiom.ai/capabilities/ai-models/) — 400+ models through OpenRouter
- [Compute](https://docs.sapiom.ai/capabilities/compute/) — Sandbox deployment and management via Blaxel
- [Data](https://docs.sapiom.ai/capabilities/data/) — Redis, vector, and search data services via Upstash
- [Messaging](https://docs.sapiom.ai/capabilities/messaging/) — Async messaging and queueing via Upstash QStash
- [Generate Images](https://docs.sapiom.ai/capabilities/images/) — AI image generation with FLUX and SDXL models
- [Audio Services](https://docs.sapiom.ai/capabilities/audio/) — Text-to-speech, transcription, and sound effects
- [Browser Automation](https://docs.sapiom.ai/capabilities/browser/) — Web scraping, screenshots, and AI browser tasks

## Integration

### MCP Servers

- [MCP Servers Overview](https://docs.sapiom.ai/integration/mcp-servers/) — Using Sapiom via Model Context Protocol
- [Claude Code](https://docs.sapiom.ai/integration/mcp-servers/claude-code/) — MCP integration with Claude Code

### Agent Frameworks

- [Agent Frameworks Overview](https://docs.sapiom.ai/integration/agent-frameworks/) — High-level AI agent framework integrations
- [LangChain](https://docs.sapiom.ai/integration/agent-frameworks/langchain/) — LangChain v1.x integration
- [LangChain Classic](https://docs.sapiom.ai/integration/agent-frameworks/langchain-classic/) — LangChain v0.x integration

### HTTP Clients

- [HTTP Clients Overview](https://docs.sapiom.ai/integration/http-clients/) — Native HTTP client integrations for Node.js
- [Axios](https://docs.sapiom.ai/integration/http-clients/axios/) — Axios wrapper with automatic payment handling
- [Fetch](https://docs.sapiom.ai/integration/http-clients/fetch/) — Native fetch() wrapper with payment handling
- [Node.js HTTP](https://docs.sapiom.ai/integration/http-clients/node-http/) — Node.js http/https modules integration

## Governance

- [Governance Overview](https://docs.sapiom.ai/governance/) — Spend limits, rules, and usage controls
- [Setting Up Rules](https://docs.sapiom.ai/governance/rules/) — Configure spending and usage rules
- [Agents & Identity](https://docs.sapiom.ai/governance/agents/) — Agent identity and tracking
- [Activity](https://docs.sapiom.ai/governance/activity/) — Transaction and usage activity monitoring

## Reference

- [Concepts](https://docs.sapiom.ai/reference/concepts/) — Key concepts and terminology

### API Reference

- [API Introduction](https://docs.sapiom.ai/api-reference/introduction/) — Overview of the Sapiom REST API
- [API Endpoints](https://docs.sapiom.ai/api-reference/endpoints/) — All available API endpoints

#### Agents

- [Agents Endpoints](https://docs.sapiom.ai/api-reference/endpoints/agents/) — Agent management endpoints
- [Get agent by ID](https://docs.sapiom.ai/api-reference/endpoints/agents/v1-agents-by-id-get/) — Retrieve a specific agent
- [Update agent](https://docs.sapiom.ai/api-reference/endpoints/agents/v1-agents-by-id-patch/) — Update an existing agent
- [List all agents](https://docs.sapiom.ai/api-reference/endpoints/agents/v1-agents-get/) — List all agents in your account
- [Create a new agent](https://docs.sapiom.ai/api-reference/endpoints/agents/v1-agents-post/) — Register a new agent

#### Analytics & Other

- [Analytics Endpoints](https://docs.sapiom.ai/api-reference/endpoints/other/) — Analytics and utility endpoints
- [Get analytics chart](https://docs.sapiom.ai/api-reference/endpoints/other/v1-analytics-chart-get/) — Retrieve chart data for analytics
- [Get analytics leaderboards](https://docs.sapiom.ai/api-reference/endpoints/other/v1-analytics-leaderboards-get/) — Retrieve leaderboard data
- [Get analytics summary](https://docs.sapiom.ai/api-reference/endpoints/other/v1-analytics-summary-get/) — Retrieve summary analytics
- [Get Sapiom payment JWKS](https://docs.sapiom.ai/api-reference/endpoints/other/.well-known-sapiom-jwks.json-get/) — Public keys for payment verification

#### Rules

- [Rules Endpoints](https://docs.sapiom.ai/api-reference/endpoints/rules/) — Spending rule management endpoints
- [Get rule by ID](https://docs.sapiom.ai/api-reference/endpoints/rules/v1-spending-rules-by-id-get/) — Retrieve a specific rule
- [Update a rule](https://docs.sapiom.ai/api-reference/endpoints/rules/v1-spending-rules-by-ruleId-put/) — Update an existing rule
- [List all rules](https://docs.sapiom.ai/api-reference/endpoints/rules/v1-spending-rules-get/) — List all spending rules
- [Create a new rule](https://docs.sapiom.ai/api-reference/endpoints/rules/v1-spending-rules-post/) — Create a new spending rule

#### Transactions

- [Transactions Endpoints](https://docs.sapiom.ai/api-reference/endpoints/transactions/) — Transaction management endpoints
- [Complete a transaction](https://docs.sapiom.ai/api-reference/endpoints/transactions/v1-transactions-by-transactionId-complete-post/) — Mark a transaction as complete
- [List transaction costs](https://docs.sapiom.ai/api-reference/endpoints/transactions/v1-transactions-by-transactionId-costs-get/) — Get costs for a transaction
- [Add cost to transaction](https://docs.sapiom.ai/api-reference/endpoints/transactions/v1-transactions-by-transactionId-costs-post/) — Add a cost entry to a transaction
- [Add facts to transaction](https://docs.sapiom.ai/api-reference/endpoints/transactions/v1-transactions-by-transactionId-facts-post/) — Add metadata facts to a transaction
- [Get transaction details](https://docs.sapiom.ai/api-reference/endpoints/transactions/v1-transactions-by-transactionId-get/) — Retrieve details for a transaction
- [Reauthorize a transaction](https://docs.sapiom.ai/api-reference/endpoints/transactions/v1-transactions-by-transactionId-reauthorize-post/) — Reauthorize with x402 payment data
- [List transactions](https://docs.sapiom.ai/api-reference/endpoints/transactions/v1-transactions-get/) — List all transactions
- [Create a new transaction](https://docs.sapiom.ai/api-reference/endpoints/transactions/v1-transactions-post/) — Create a new transaction

#### Verification

- [Verification Endpoints](https://docs.sapiom.ai/api-reference/endpoints/verification/) — Phone and email verification endpoints
- [Check verification code](https://docs.sapiom.ai/api-reference/endpoints/verification/v1-services-verify-check-post/) — Validate a submitted verification code
- [Send verification code](https://docs.sapiom.ai/api-reference/endpoints/verification/v1-services-verify-send-post/) — Send a verification code to phone or email

### SDK Reference

- [SDK Reference Overview](https://docs.sapiom.ai/reference/sdk/) — All SDK packages and exports
- [@sapiom/fetch](https://docs.sapiom.ai/reference/sdk/fetch/) — Native fetch() wrapper with payment handling
- [@sapiom/axios](https://docs.sapiom.ai/reference/sdk/axios/) — Axios integration with payment handling
- [@sapiom/node-http](https://docs.sapiom.ai/reference/sdk/node-http/) — Node.js http/https client with payment handling
- [@sapiom/langchain](https://docs.sapiom.ai/reference/sdk/langchain/) — LangChain v1.x middleware for agent tracking
- [@sapiom/langchain-classic](https://docs.sapiom.ai/reference/sdk/langchain-classic/) — LangChain v0.x integration for agent tracking
