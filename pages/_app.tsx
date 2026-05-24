import type { AppProps } from 'next/app';
import { MotionConfig } from 'framer-motion';
import '@/styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <MotionConfig reducedMotion="user">
            <Component {...pageProps} />
        </MotionConfig>
    );
}
