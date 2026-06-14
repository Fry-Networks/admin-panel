/**
 * Server-side algod client with ATLAS00 primary + Nodely fallback.
 * Used by getServerSideProps and API routes.
 */

const ALGOD_PRIMARY = 'http://192.168.9.2:4190';
const ALGOD_FALLBACK = 'https://mainnet-api.4160.nodely.dev';

async function algodFetch(path: string): Promise<any> {
  const token = process.env.ALGOD_TOKEN || '';
  const urls = [ALGOD_PRIMARY, ALGOD_FALLBACK];
  for (const url of urls) {
    try {
      const res = await fetch(url + path, {
        headers: token ? { 'X-Algo-API-Token': token } : {},
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`[algod-server] ${url} failed:`, e);
    }
  }
  throw new Error('Algod fetch failed on all endpoints');
}

function decodeV2VoteBox(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset);
  return {
    endTime: Number(view.getBigUint64(40, false)),
    lockDuration: Number(view.getBigUint64(48, false)),
    numOptions: Number(view.getBigUint64(56, false)),
    totalTokens: Array.from({ length: 4 }, (_, i) => view.getBigUint64(72 + i * 8, false).toString()),
    totalVoters: Array.from({ length: 14 }, (_, i) => view.getBigUint64(104 + i * 8, false).toString()),
  };
}

function decodeV1VoteBox(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset);
  return {
    endTime: Number(view.getBigUint64(33, false)),
    lockDuration: Number(view.getBigUint64(41, false)),
    numOptions: data[32],
    totalTokens: Array.from({ length: 8 }, (_, i) => view.getBigUint64(92 + i * 8, false).toString()),
    totalVoters: Array.from({ length: 8 }, (_, i) => view.getBigUint64(156 + i * 8, false).toString()),
  };
}

export async function fetchVoteBoxOnChain(
  voteIdHex: string
): Promise<{ source: string; tallies: any } | null> {
  const voteIdBytes = Uint8Array.from(Buffer.from(voteIdHex, 'hex'));
  const prefix = new Uint8Array([0x76]);
  const boxName = new Uint8Array(prefix.length + voteIdBytes.length);
  boxName.set(prefix, 0);
  boxName.set(voteIdBytes, prefix.length);
  const b64Name = Buffer.from(boxName).toString('base64');

  // Try V2 first
  try {
    const path = `/v2/applications/3594179146/box?name=b64:${encodeURIComponent(b64Name)}`;
    const data = await algodFetch(path);
    const value = Uint8Array.from(Buffer.from(data.value, 'base64'));
    return { source: 'V2', tallies: decodeV2VoteBox(value) };
  } catch (e: any) {
    if (e.message?.includes('404')) {
      // V2 not found, try V1 legacy
      try {
        const path = `/v2/applications/3500693631/box?name=b64:${encodeURIComponent(b64Name)}`;
        const data = await algodFetch(path);
        const value = Uint8Array.from(Buffer.from(data.value, 'base64'));
        return { source: 'V1 legacy', tallies: decodeV1VoteBox(value) };
      } catch (e2: any) {
        if (e2.message?.includes('404')) return null;
        console.warn('[algod-server] V1 fetch error:', e2);
        return null;
      }
    }
    console.warn('[algod-server] V2 fetch error:', e);
    return null;
  }
}
