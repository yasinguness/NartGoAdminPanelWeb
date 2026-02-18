import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCountdown } from '../../utils/raffle/formatters';

interface CountdownTimerProps {
    targetDate: Date;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate }) => {
    const [timeString, setTimeString] = useState('00:00:00');

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeString(formatCountdown(targetDate));
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    return (
        <div className="countdown-section">
            <div className="countdown-label">Çekilişe Kalan Süre</div>
            <div className="countdown-display">
                <AnimatePresence mode="wait">
                    <motion.span
                        key={timeString}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {timeString}
                    </motion.span>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CountdownTimer;
