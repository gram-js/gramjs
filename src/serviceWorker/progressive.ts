import { pause } from '../util/schedulers';
import generateIdFor from '../util/generateIdFor';
import { DEBUG, MEDIA_CACHE_MAX_BYTES, MEDIA_PROGRESSIVE_CACHE_NAME } from '../config';

declare const self: ServiceWorkerGlobalScope;

type PartInfo = {
  type: 'PartInfo';
  arrayBuffer: ArrayBuffer;
  mimeType: 'string';
  fullSize: number;
};

type RequestStates = {
  resolve: (response: PartInfo) => void;
  reject: () => void;
};

const DEFAULT_PART_SIZE = 512 * 1024; // 512 kB
const PART_TIMEOUT = 10000;
const MAX_END_TO_CACHE = 3 * 1024 * 1024 - 1; // We only cache the first 3 MB of each file

const requestStates: Record<string, RequestStates> = {};

export async function respondForProgressive(e: FetchEvent) {
  const { url } = e.request;
  const range = e.request.headers.get('range');
  const bytes = /^bytes=(\d+)-(\d+)?$/g.exec(range || '')!;
  const start = Number(bytes[1]);

  let end = Number(bytes[2]);
  if (!end || (end - start + 1) > DEFAULT_PART_SIZE) {
    end = start + DEFAULT_PART_SIZE - 1;
  }

  const cacheKey = `${url}?start=${start}&end=${end}`;
  const [cachedArrayBuffer, cachedHeaders] = await fetchFromCache(cacheKey);

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('FETCH PROGRESSIVE', cacheKey, 'CACHED:', Boolean(cachedArrayBuffer));
  }

  if (cachedArrayBuffer) {
    return new Response(cachedArrayBuffer, {
      status: 206,
      statusText: 'Partial Content',
      headers: cachedHeaders,
    });
  }

  let partInfo;
  try {
    partInfo = await requestPart(e, { url, start, end });
  } catch (err) {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.error('FETCH PROGRESSIVE', err);
    }
  }

  if (!partInfo) {
    return new Response('', {
      status: 500,
      statusText: 'Failed to fetch progressive part',
    });
  }

  const { arrayBuffer, fullSize, mimeType } = partInfo;

  const partSize = Math.min(end - start + 1, arrayBuffer.byteLength);
  end = start + partSize - 1;
  const arrayBufferPart = arrayBuffer.slice(0, partSize);
  const headers = [
    ['Content-Range', `bytes ${start}-${end}/${fullSize}`],
    ['Accept-Ranges', 'bytes'],
    ['Content-Length', String(partSize)],
    ['Content-Type', mimeType],
  ];

  if (partSize <= MEDIA_CACHE_MAX_BYTES && end < MAX_END_TO_CACHE) {
    saveToCache(cacheKey, arrayBufferPart, headers);
  }

  return new Response(arrayBufferPart, {
    status: 206,
    statusText: 'Partial Content',
    headers,
  });
}

self.addEventListener('message', (e) => {
  const { type, messageId, result } = e.data as {
    type: string;
    messageId: string;
    result: PartInfo;
  };

  if (type === 'partResponse' && requestStates[messageId]) {
    requestStates[messageId].resolve(result);
  }
});

// We can not cache 206 responses: https://github.com/GoogleChrome/workbox/issues/1644#issuecomment-638741359
async function fetchFromCache(cacheKey: string) {
  const cache = await self.caches.open(MEDIA_PROGRESSIVE_CACHE_NAME);

  return Promise.all([
    cache.match(`${cacheKey}&type=arrayBuffer`).then((r) => (r ? r.arrayBuffer() : undefined)),
    cache.match(`${cacheKey}&type=headers`).then((r) => (r ? r.json() : undefined)),
  ]);
}

async function saveToCache(cacheKey: string, arrayBuffer: ArrayBuffer, headers: HeadersInit) {
  const cache = await self.caches.open(MEDIA_PROGRESSIVE_CACHE_NAME);

  return Promise.all([
    cache.put(new Request(`${cacheKey}&type=arrayBuffer`), new Response(arrayBuffer)),
    cache.put(new Request(`${cacheKey}&type=headers`), new Response(JSON.stringify(headers))),
  ]);
}

async function requestPart(
  e: FetchEvent,
  params: { url: string; start: number; end: number },
): Promise<PartInfo | undefined> {
  if (!e.clientId) {
    return undefined;
  }

  // eslint-disable-next-line no-restricted-globals
  const client = await self.clients.get(e.clientId);
  if (!client) {
    return undefined;
  }

  const messageId = generateIdFor(requestStates);
  requestStates[messageId] = {} as RequestStates;

  const promise = Promise.race([
    pause(PART_TIMEOUT).then(() => Promise.reject(new Error('ERROR_PART_TIMEOUT'))),
    new Promise<PartInfo>((resolve, reject) => {
      Object.assign(requestStates[messageId], { resolve, reject });
    }),
  ]);

  promise.then(
    () => {
      delete requestStates[messageId];
    },
    () => {
      delete requestStates[messageId];
    },
  );

  client.postMessage({
    type: 'requestPart',
    messageId,
    params,
  });

  return promise;
}
