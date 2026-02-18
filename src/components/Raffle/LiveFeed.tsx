import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRaffleStore } from '../../store/raffle/raffleStore';
import { formatRelativeTime } from '../../utils/raffle/formatters';

const LiveFeed: React.FC = () => {
    const ticketSales = useRaffleStore(state => state.ticketSales);

    return (
        <div className="live-feed-section">
            <h2 className="feed-title">🔴 Canlı Bilet Satışları</h2>
            <div className="feed-list">
                <AnimatePresence initial={false}>
                    {ticketSales.map((sale, index) => (
                        <motion.div
                            key={`${sale.userId}-${sale.timestamp.getTime()}`}
                            className="feed-item"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                            <span className="feed-emoji">{sale.emoji}</span>
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(sale.userName)}&background=random`}
                                alt={sale.userName}
                                className="feed-avatar"
                            />
                            <div className="feed-content">
                                <div className="feed-name">{sale.userName}</div>
                                <div className="feed-details">
                                    {sale.ticketCount} bilet aldı • {formatRelativeTime(sale.timestamp)}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {ticketSales.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
                        Henüz bilet satışı yok...
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveFeed;
