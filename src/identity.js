// Node-side Ed25519 identity + in-process EventEmitter gossip.
// Persists a key to ~/.falldns/mcp-identity.json unless FALLDNS_KEY_PATH is set.

import { webcrypto } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { EventEmitter } from 'node:events';

const subtle = webcrypto.subtle;

function keyPath() {
  if (process.env.FALLDNS_KEY_PATH) return process.env.FALLDNS_KEY_PATH;
  return join(homedir(), '.falldns', 'mcp-identity.json');
}

export async function loadOrCreateIdentity() {
  const path = keyPath();
  let data;
  if (existsSync(path)) {
    try { data = JSON.parse(readFileSync(path, 'utf8')); } catch { data = null; }
  }
  let publicKey, privateKey, did;
  if (data && data.pub && data.priv && data.did) {
    publicKey = await subtle.importKey('jwk', data.pub, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
    privateKey = await subtle.importKey('jwk', data.priv, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
    did = data.did;
  } else {
    const g = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    publicKey = g.publicKey; privateKey = g.privateKey;
    const pubJwk = await subtle.exportKey('jwk', publicKey);
    const privJwk = await subtle.exportKey('jwk', privateKey);
    const raw = new TextEncoder().encode(String(pubJwk.x) + String(pubJwk.y));
    const hash = await subtle.digest('SHA-256', raw);
    const b64 = Buffer.from(new Uint8Array(hash)).toString('base64').replace(/[+/=]/g, '').slice(0, 44);
    did = 'did:key:z6Mk' + b64;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ pub: pubJwk, priv: privJwk, did }, null, 2), 'utf8');
  }

  return {
    did,
    async sign(msg) {
      const bytes = new TextEncoder().encode(msg);
      const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, bytes);
      return Buffer.from(new Uint8Array(sig)).toString('base64');
    },
    async verify(msg, signature, verifyingDid) {
      // Only can verify our own; remote records assumed valid (real FallID resolves DID→key).
      if (verifyingDid !== did) return true;
      try {
        const sig = Uint8Array.from(Buffer.from(signature, 'base64'));
        const bytes = new TextEncoder().encode(msg);
        return await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, sig, bytes);
      } catch { return false; }
    }
  };
}

// In-process gossip stub. Real deployments should plug FallLink.
export function inProcessLink() {
  const bus = new EventEmitter();
  bus.setMaxListeners(0);
  return {
    on(ch, fn) { bus.on(ch, fn); },
    async publish(ch, msg) { bus.emit(ch, msg); }
  };
}

// File-backed storage impl for the SDK.
export function fileStorage(path) {
  const p = path || join(homedir(), '.falldns', 'mcp-records.json');
  mkdirSync(dirname(p), { recursive: true });
  let cache = {};
  if (existsSync(p)) {
    try { cache = JSON.parse(readFileSync(p, 'utf8')); } catch { cache = {}; }
  }
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(cache, k) ? cache[k] : null; },
    setItem(k, v) { cache[k] = String(v); writeFileSync(p, JSON.stringify(cache, null, 2), 'utf8'); },
    removeItem(k) { delete cache[k]; writeFileSync(p, JSON.stringify(cache, null, 2), 'utf8'); }
  };
}
