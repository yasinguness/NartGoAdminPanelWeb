import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRaffleStore } from '../../store/raffle/raffleStore';

const LiveFeed: React.FC = () => {
    const ticketSales = useRaffleStore(state => state.participants);

    return (
        <div className="live-feed-section">
            <h2 className="feed-title">Katılımcılar</h2>
            <div className="feed-list">
                <AnimatePresence initial={false}>
                    {ticketSales.map((sale, index) => (
                        <motion.div
                            key={sale.id}
                            className="feed-item"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                            <span className="feed-emoji">🎟️</span>
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(sale.name)}&background=random`}
                                alt={sale.name}
                                className="feed-avatar"
                            />
                            <div className="feed-content">
                                <div className="feed-name">{sale.name}</div>
                                <div className="feed-details">
                                    {sale.ticketCount} çekiliş hakkı
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {ticketSales.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
                        Henüz katılımcı yok...
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveFeed;
