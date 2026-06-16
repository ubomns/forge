import type { AppProps } from 'next/app';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '@/lib/auth';
import '@/styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <MotionConfig reducedMotion="user">
            <AuthProvider>
                <Component {...pageProps} />
            </AuthProvider>
        </MotionConfig>
    );
}
