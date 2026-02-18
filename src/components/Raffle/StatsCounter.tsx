import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, DollarSign } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/raffle/formatters';

interface StatsCounterProps {
    type: 'revenue' | 'tickets';
    value: number;
}

const StatsCounter: React.FC<StatsCounterProps> = ({ type, value }) => {
    const isRevenue = type === 'revenue';
    const Icon = isRevenue ? DollarSign : Ticket;
    const label = isRevenue ? 'Toplam Gelir' : 'Toplam Bilet';
    const displayValue = isRevenue ? formatCurrency(value) : formatNumber(value);

    // Split the value into individual digits for odometer effect
    const digits = displayValue.split('');

    return (
        <div className="stat-card">
            <div className="stat-label">
                <Icon size={24} style={{ display: 'inline', marginRight: '8px' }} />
                {label}
            </div>
            <div className="stat-value">
                {digits.map((digit, index) => (
                    <AnimatePresence mode="wait" key={`${type}-${index}`}>
                        <motion.span
                            key={`${digit}-${value}-${index}`}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.05 }}
                            style={{ display: 'inline-block', minWidth: digit.match(/\d/) ? '0.6em' : '0.3em' }}
                        >
                            {digit}
                        </motion.span>
                    </AnimatePresence>
                ))}
            </div>
        </div>
    );
};

export default StatsCounter;
