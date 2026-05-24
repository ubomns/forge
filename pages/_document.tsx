import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Modern browsers prefer SVG favicons — sharper at every size, theme-aware */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* Fallback for older browsers that don't read SVG icons */}
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
