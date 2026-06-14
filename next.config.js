const path = require('path');
// Use an absolute alias for webpack and a project-relative alias for Turbopack.
const reactModalAliasWebpack = path.resolve(
  __dirname,
  'components/compat/react-modal.tsx'
);
const reactModalAliasTurbo = './components/compat/react-modal.tsx';
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com'
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh'
      }
    ]
  },
  turbopack: {
    resolveAlias: {
      // Turbopack expects project-relative paths here.
      'react-modal': reactModalAliasTurbo
    }
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Webpack expects absolute paths for aliases.
      'react-modal': reactModalAliasWebpack
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',  // Apply to all routes
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "form-action 'self' https://admin.frynetworks.com/api/auth/signin/github;"
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
