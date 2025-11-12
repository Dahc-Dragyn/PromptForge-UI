/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disabling strict mode is necessary in development for the Google Auth
  // provider to work correctly with the Cross-Origin policies. It prevents
  // double-rendering issues that can interfere with the auth flow.
  reactStrictMode: false,

  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            // This value is needed for Firebase Google Auth to work.
            // It allows cross-origin resources to be embedded.
            value: 'credentialless',
          },
        ],
      },
      {
        // This is a workaround for a known issue with Next.js development mode and COOP/COEP headers.
        // It disables the headers for the Hot Module Replacement (HMR) path.
        source: '/_next/webpack-hmr',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;