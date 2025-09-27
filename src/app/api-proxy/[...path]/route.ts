// src/app/api-proxy/[...path]/route.ts
import { NextRequest } from 'next/server';

async function handler(req: NextRequest) {
  // 1. Get the path from the incoming request and remove the '/api-proxy' prefix.
  let requestedPath = req.nextUrl.pathname.replace('/api-proxy', '');

  // 2. Add a trailing slash ONLY for specific collection endpoints that require it.
  // This handles the backend's redirect behavior for lists like /prompts and /templates.
  const pathsNeedingSlash = ['/prompts', '/templates'];
  if (pathsNeedingSlash.includes(requestedPath)) {
    requestedPath += '/';
  }

  // 3. Construct the full backend URL from environment variables.
  const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}${requestedPath}`;

  // 4. Forward the request to the backend, carefully copying the method, headers, and body.
  const response = await fetch(backendUrl, {
    method: req.method,
    headers: {
      'Content-Type': req.headers.get('Content-Type') || 'application/json',
      'Authorization': req.headers.get('Authorization') || '',
    },
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    // This is required for streaming request bodies in modern Node.js versions.
    // @ts-ignore
    duplex: 'half'
  });

  // 5. Return the backend's response directly to the original frontend caller.
  return response;
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };