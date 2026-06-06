import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  guideSidebar: [
    'intro',
    {
      type: 'category',
      label: 'User Guide',
      items: [
        'guide/device-overview',
        'guide/device-wifi-token',
        'guide/quick-start',
        'guide/device-token-activation',
        'guide/ai-companion',
        'guide/modes-overview',
        'guide/reconnect-disconnect',
      ],
    },
    'downloads',
    {
      type: 'category',
      label: 'Support',
      items: [
        'support/support',
        'faq',
        'troubleshooting/troubleshooting',
        'support/warranty-policy',
        'support/returns-exchanges',
        'support/quality-assurance',
        'support/contact-support',
      ],
    },
    {
      type: 'category',
      label: 'Privacy & Legal',
      items: [
        'legal/privacy-legal',
        'legal/privacy-policy',
        'legal/data-policy',
        'legal/terms-of-use',
      ],
    },
    {
      type: 'category',
      label: 'Next Iterations',
      items: [
        'roadmap/content-plan',
      ],
    },
  ],
};

export default sidebars;
