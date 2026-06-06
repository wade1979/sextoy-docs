import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Product Guide',
  tagline: 'A practical guide for device token access, activation, and core modes.',
  favicon: 'img/logo.svg',

  url: 'https://docs.example.com',
  baseUrl: '/',

  organizationName: 'pulsar',
  projectName: 'sextoy-docs',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  trailingSlash: true,
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: undefined,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    navbar: {
      title: 'Product Guide',
      logo: {
        alt: 'Product Guide',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guideSidebar',
          position: 'left',
          label: 'User Guide',
        },
        {
          to: '/support/',
          label: 'Support',
          position: 'left',
        },
        {
          to: '/downloads',
          label: 'Downloads',
          position: 'left',
        },
        {
          to: '/legal/',
          label: 'Privacy & Legal',
          position: 'left',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Support',
          items: [
            {
              label: 'Help & FAQ',
              to: '/faq/',
            },
            {
              label: 'Warranty Policy',
              to: '/support/warranty-policy/',
            },
            {
              label: 'Contact Support',
              to: '/support/contact-support/',
            },
          ],
        },
        {
          title: 'Privacy & Legal',
          items: [
            {
              label: 'Privacy Policy',
              to: '/legal/privacy-policy/',
            },
            {
              label: 'Data Policy',
              to: '/legal/data-policy/',
            },
            {
              label: 'Terms of Use',
              to: '/legal/terms-of-use/',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Product Guide.`,
    },
    prism: {
      theme: require('prism-react-renderer').themes.github,
      darkTheme: require('prism-react-renderer').themes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
