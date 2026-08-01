import type { NextConfig } from 'next';

const codespaceHost =
  process.env.CODESPACE_NAME &&
  process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  allowedDevOrigins: codespaceHost ? [codespaceHost] : [],

  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        ...(codespaceHost ? [codespaceHost] : []),
      ],
    },
  },
};

export default nextConfig;
