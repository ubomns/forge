import type { AppProps } from 'next/app';
import Head from 'next/head';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '@/lib/auth';
import { AuthModalManager } from '@/components/auth/AuthModalManager';
import '@/styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <MotionConfig reducedMotion="user">
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <AuthProvider>
                <AuthModalManager>
                    <Component {...pageProps} />
                </AuthModalManager>
            </AuthProvider>
        </MotionConfig>
    );
}
