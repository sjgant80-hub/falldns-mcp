# @ai-native-solutions/falldns-mcp

MCP server for **FallDNS** — sovereign human-readable name resolution over stdio. Wraps [`@ai-native-solutions/falldns-sdk`](https://github.com/sjgant80-hub/falldns-sdk).

## Install and register

```bash
npm install -g @ai-native-solutions/falldns-mcp

# Register with Claude Code
claude mcp add falldns falldns-mcp
```

or run locally:

```bash
npx @ai-native-solutions/falldns-mcp
```

## Tools

| Tool | Purpose |
|---|---|
| `falldns_claim` | Claim a `.fall` name |
| `falldns_resolve` | Resolve a `.fall` name to DID + trust score + conflicts |
| `falldns_release` | Publish a signed release for one of your names |
| `falldns_list_mine` | List your active claims |
| `falldns_list_known` | List every known name |
| `falldns_list_conflicts` | List contested names |

## Resources

- `falldns://identity` — this MCP server's DID
- `falldns://records` — all signed records held locally
- `falldns://directory` — every known name with winning DID

## Identity + storage

- Ed25519/P-256 key auto-created at `~/.falldns/mcp-identity.json` (override with `FALLDNS_KEY_PATH`)
- Records file at `~/.falldns/mcp-records.json` (override with `FALLDNS_RECORDS_PATH`)

## Signed record format

```json
{
  "name": "alice.fall",
  "did": "did:key:z6Mk...",
  "timestamp": "2026-07-06T10:00:00.000Z",
  "action": "claim",
  "signature": "..."
}
```

Signature is over `${action}|${name}|${did}|${timestamp}`.

## License

MIT · AI-Native Solutions
