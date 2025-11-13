import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'data');
const FILE = path.join(STORE_PATH, 'push_tokens.json');

type TokenEntry = { userId: string; token: string; updatedAt: string };

function ensureStore() {
  if (!fs.existsSync(STORE_PATH)) fs.mkdirSync(STORE_PATH, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([]));
}

export function saveToken(userId: string, token: string) {
  ensureStore();
  const raw = fs.readFileSync(FILE, 'utf8');
  const list: TokenEntry[] = JSON.parse(raw || '[]');
  const now = new Date().toISOString();
  try{
    // Log masked token for debugging (avoid printing full tokens in logs)
    const tSample = typeof token === 'string' && token.length > 12 ? `${token.slice(0,6)}...${token.slice(-6)}` : token;
    console.log('pushStore.saveToken: saving token for user', userId, '; token:', tSample);
  }catch(e){/* ignore logging errors */}
  const existing = list.find((l) => l.userId === userId || l.token === token);
  if (existing) {
    existing.userId = userId;
    existing.token = token;
    existing.updatedAt = now;
  } else {
    list.push({ userId, token, updatedAt: now });
  }
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
}

export function listTokens(): TokenEntry[] {
  ensureStore();
  const raw = fs.readFileSync(FILE, 'utf8');
  return JSON.parse(raw || '[]');
}

export function removeToken(token: string) {
  ensureStore();
  const raw = fs.readFileSync(FILE, 'utf8');
  const list: TokenEntry[] = JSON.parse(raw || '[]');
  const filtered = list.filter((l) => l.token !== token);
  fs.writeFileSync(FILE, JSON.stringify(filtered, null, 2));
}

export default { saveToken, listTokens, removeToken };
