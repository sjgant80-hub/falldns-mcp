#!/usr/bin/env node
// falldns-mcp · MCP stdio server wrapping falldns-sdk · MIT · AI-Native Solutions
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server({ name: 'falldns-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });

const TOOLS = [
  {
    name: 'falldns_ensure_fall_i_d',
    description: 'ensureFallID · from falldns-sdk',
    inputSchema: { type: 'object', properties: {} },
    handler: async (args) => {
      const { ensureFallID } = await import('@ai-native-solutions/falldns-sdk');
      return typeof ensureFallID === 'function' ? await ensureFallID(args) : { error: 'ensureFallID not callable' };
    }
  },
  {
    name: 'falldns_ensure_fall_link',
    description: 'ensureFallLink · from falldns-sdk',
    inputSchema: { type: 'object', properties: {} },
    handler: async (args) => {
      const { ensureFallLink } = await import('@ai-native-solutions/falldns-sdk');
      return typeof ensureFallLink === 'function' ? await ensureFallLink(args) : { error: 'ensureFallLink not callable' };
    }
  },
  {
    name: 'falldns_status_msg',
    description: 'statusMsg · from falldns-sdk',
    inputSchema: { type: 'object', properties: {} },
    handler: async (args) => {
      const { statusMsg } = await import('@ai-native-solutions/falldns-sdk');
      return typeof statusMsg === 'function' ? await statusMsg(args) : { error: 'statusMsg not callable' };
    }
  },
  {
    name: 'falldns_render_mine',
    description: 'renderMine · from falldns-sdk',
    inputSchema: { type: 'object', properties: {} },
    handler: async (args) => {
      const { renderMine } = await import('@ai-native-solutions/falldns-sdk');
      return typeof renderMine === 'function' ? await renderMine(args) : { error: 'renderMine not callable' };
    }
  },
  {
    name: 'falldns_render_dir',
    description: 'renderDir · from falldns-sdk',
    inputSchema: { type: 'object', properties: {} },
    handler: async (args) => {
      const { renderDir } = await import('@ai-native-solutions/falldns-sdk');
      return typeof renderDir === 'function' ? await renderDir(args) : { error: 'renderDir not callable' };
    }
  },
  {
    name: 'falldns_render_conflicts',
    description: 'renderConflicts · from falldns-sdk',
    inputSchema: { type: 'object', properties: {} },
    handler: async (args) => {
      const { renderConflicts } = await import('@ai-native-solutions/falldns-sdk');
      return typeof renderConflicts === 'function' ? await renderConflicts(args) : { error: 'renderConflicts not callable' };
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ handler, ...rest }) => rest)
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const t = TOOLS.find(x => x.name === req.params.name);
  if (!t) throw new Error('unknown tool: ' + req.params.name);
  const result = await t.handler(req.params.arguments || {});
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
});

await server.connect(new StdioServerTransport());
console.error('falldns-mcp v1.0.0 · stdio ready');
