import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  guideSidebar: [
    'intro',
    {
      type: 'category',
      label: 'User Guide',
      items: [
        'guide/device-overview',
        'guide/videos',
        'guide/quick-start',
        'guide/motion-intelligence',
        'guide/device-wifi-token',
        'guide/device-token-activation',
        'guide/ai-companion',
        {
          type: 'category',
          label: 'Device Control Modes',
          link: {type: 'doc', id: 'guide/modes-overview'},
          items: [
            'guide/modes/ai-companion-mode',
            'guide/modes/free-control',
            'guide/modes/video-sync',
            'guide/modes/live-sync',
          ],
        },
        'guide/vr-compatibility',
        'guide/reconnect-disconnect',
      ],
    },
    'downloads',
    {
      type: 'category',
      label: 'Support',
      items: [
        'support/support',
        'buying-faq',
        'faq',
        'troubleshooting/troubleshooting',
        {type: 'link', label: 'Warranty Policy', href: 'https://getpulsar.io/support/warranty-policy'},
        {type: 'link', label: 'Returns & Exchanges', href: 'https://getpulsar.io/support/returns-exchanges'},
        {type: 'link', label: 'Contact Support', href: 'https://getpulsar.io/support/contact-support'},
      ],
    },
    {
      type: 'category',
      label: 'Privacy & Legal',
      items: [
        'legal/privacy-policy',
        'legal/terms-of-use',
        'legal/ai-data-practices',
      ],
    },
  ],
};

export default sidebars;
