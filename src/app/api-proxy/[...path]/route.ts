import { NextRequest, NextResponse } from 'next/server';

async function handler(req: NextRequest) {
  // 🔒 SECURITY FIX: Use private server-side variable (No NEXT_PUBLIC_)
  const backendUrl = process.env.BACKEND_API_URL;
  
  if (!backendUrl) {
    return new NextResponse('Backend API URL is not configured.', { status: 500 });
  }

  // Strip '/api-proxy' from the path
  let requestedPath = req.nextUrl.pathname.replace(/^\/api-proxy/, '');
  
  const pathsNeedingSlash = [
    '/prompts', 
    '/templates'
  ];

  if (pathsNeedingSlash.includes(requestedPath)) {
    requestedPath += '/';
  }
  
  // 🐛 PATH FIX: Target /api/v1 directly to match main.py
  const targetUrl = `${backendUrl}/api/v1${requestedPath}${req.nextUrl.search}`;
  
  const headers = new Headers(req.headers);
  headers.set('host', new URL(targetUrl).host);
  headers.set('ngrok-skip-browser-warning', 'true');
  headers.set('Connection', 'keep-alive');

  const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.blob() : undefined;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      redirect: 'follow'
    });
    
    return response;

  } catch (error) {
    console.error('API proxy error:', error);
    return new NextResponse('Proxy request failed.', { status: 502 });
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };