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
      label: 'Help & FAQ',
      items: [
        'troubleshooting/troubleshooting',
        'faq',
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
