// FallDNS MCP server (stdio). Exposes claim / resolve / list tools + records resource.
// MIT · AI-Native Solutions

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { FallDNS } from '@ai-native-solutions/falldns-sdk';
import { loadOrCreateIdentity, inProcessLink, fileStorage } from './identity.js';

const TOOLS = [
  {
    name: 'falldns_claim',
    description: 'Claim a human-readable .fall name for this MCP identity. Signs and gossips a claim record. Rejects if another DID already has an earlier active claim.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'e.g. "alice.fall" (.fall auto-appended if omitted)' } },
      required: ['name']
    }
  },
  {
    name: 'falldns_resolve',
    description: 'Resolve a .fall name to its winning DID, timestamp, trust score, and conflict count.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name']
    }
  },
  {
    name: 'falldns_release',
    description: 'Publish a signed release for a name this identity previously claimed.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name']
    }
  },
  {
    name: 'falldns_list_mine',
    description: 'List every name currently claimed by this MCP identity.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'falldns_list_known',
    description: 'List every known name with winning DID, timestamp, trust score, and conflict count.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'falldns_list_conflicts',
    description: 'List names with two or more active claimants — winner (earliest) plus challengers.',
    inputSchema: { type: 'object', properties: {} }
  }
];

const RESOURCES = [
  { uri: 'falldns://identity', name: 'FallDNS identity', description: 'This MCP server’s DID', mimeType: 'application/json' },
  { uri: 'falldns://records', name: 'FallDNS records', description: 'All signed records held locally', mimeType: 'application/json' },
  { uri: 'falldns://directory', name: 'FallDNS directory', description: 'Every known name with winning DID', mimeType: 'application/json' }
];

export async function start() {
  const fid = await loadOrCreateIdentity();
  const flk = inProcessLink();
  const storage = fileStorage(process.env.FALLDNS_RECORDS_PATH || undefined);
  const dns = new FallDNS({ fallidInstance: fid, falllinkInstance: flk, storage });

  const server = new Server(
    { name: 'falldns-mcp', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    try {
      let payload;
      if (name === 'falldns_claim') payload = await dns.claim(args.name);
      else if (name === 'falldns_resolve') {
        const res = await dns.resolve(args.name);
        payload = res || { result: 'no claim found', name: args.name };
      }
      else if (name === 'falldns_release') payload = await dns.releaseName(args.name);
      else if (name === 'falldns_list_mine') payload = await dns.listMyClaims();
      else if (name === 'falldns_list_known') payload = await dns.listAllKnown();
      else if (name === 'falldns_list_conflicts') payload = await dns.listConflicts();
      else throw new Error(`unknown tool: ${name}`);
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: `Error: ${e.message}` }] };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: RESOURCES }));

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const uri = req.params.uri;
    let body;
    if (uri === 'falldns://identity') body = { did: fid.did };
    else if (uri === 'falldns://records') body = dns.exportRecords();
    else if (uri === 'falldns://directory') body = await dns.listAllKnown();
    else throw new Error(`unknown resource: ${uri}`);
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(body, null, 2) }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export default { start };
