#!/usr/bin/env node
import { start } from '../src/index.js';
start().catch(e => {
  console.error(`[falldns-mcp] fatal: ${e.message}`);
  process.exit(1);
});
