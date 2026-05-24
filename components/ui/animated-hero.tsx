import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ROTATING_WORDS = [
    'profitable',
    'scalable',
    'innovative',
    'disruptive',
    'fundable',
    'market-ready',
];

export function AnimatedHero() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex(prev => (prev + 1) % ROTATING_WORDS.length);
        }, 2200);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="hero">
            <h1 className="hero-title">
                <motion.span
                    initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                    Turn your concept
                </motion.span>
                <motion.span
                    initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                    into something{' '}
                    <span className="hero-word-flip" aria-live="polite">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={ROTATING_WORDS[index]}
                                className="hero-word-accent"
                                initial={{ rotateX: 90, opacity: 0 }}
                                animate={{ rotateX: 0, opacity: 1 }}
                                exit={{ rotateX: -90, opacity: 0 }}
                                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                                style={{ display: 'inline-block', transformOrigin: '50% 50%' }}
                            >
                                {ROTATING_WORDS[index]}
                            </motion.span>
                        </AnimatePresence>
                    </span>
                    .
                </motion.span>
            </h1>

            <motion.p
                className="hero-sub"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
                Describe your idea in plain English — our AI drafts your first business plan.
            </motion.p>
        </div>
    );
}
