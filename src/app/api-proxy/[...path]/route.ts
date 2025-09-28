// src/app/api-proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

async function handler(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  if (!backendUrl) {
    return new NextResponse('Backend API URL is not configured.', { status: 500 });
  }

  let requestedPath = req.nextUrl.pathname.replace(/^\/api-proxy/, '');
  
  const pathsNeedingSlash = ['/prompts', '/templates'];
  if (pathsNeedingSlash.includes(requestedPath)) {
    requestedPath += '/';
  }
  
  const targetUrl = `${backendUrl}/api/promptforge/api/v1${requestedPath}${req.nextUrl.search}`;
  
  const headers = new Headers(req.headers);
  headers.set('host', new URL(targetUrl).host);
  headers.set('ngrok-skip-browser-warning', 'true');
  // FINAL FIX 1: Add keep-alive header to stabilize connection
  headers.set('Connection', 'keep-alive');

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      // @ts-ignore
      duplex: 'half', 
      redirect: 'follow'
    });
    
    return response;

  } catch (error) {
    console.error('API proxy error:', error);
    return new NextResponse('Proxy request failed.', { status: 502 });
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };