import React, {useEffect} from 'react';
import Head from '@docusaurus/Head';

export default function SupportPolicyRedirect({slug, title}: {slug: string; title: string}) {
  const target = `https://getpulsar.io/support/${slug}`;
  useEffect(() => {
    window.location.replace(target + window.location.search + window.location.hash);
  }, [target]);
  return <><Head><link rel="canonical" href={target} /><meta name="robots" content="noindex, follow" /></Head>
    <h1>{title}</h1><p>This page has moved to the Pulsar website.</p>
    <p><a href={target}>Read {title} on getpulsar.io →</a></p>
  </>;
}
