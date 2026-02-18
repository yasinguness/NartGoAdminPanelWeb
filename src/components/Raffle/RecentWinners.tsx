import React from 'react';
import { motion } from 'framer-motion';
import { useRaffleStore } from '../../store/raffle/raffleStore';
import { formatRelativeTime } from '../../utils/raffle/formatters';

const RecentWinners: React.FC = () => {
    const winners = useRaffleStore(state => state.winners);

    return (
        <div style={{ flex: 1 }}>
            <h3 className="section-title">🎉 Son Kazananlar</h3>
            {winners.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
                    Henüz kazanan yok...
                </div>
            ) : (
                <div>
                    {winners.slice(0, 5).map((winner, index) => (
                        <motion.div
                            key={`${winner.participant.id}-${winner.timestamp.getTime()}`}
                            className="winner-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="winner-name">🎊 {winner.participant.name}</div>
                            <div className="winner-prize">{winner.prize}</div>
                            <div className="winner-time">{formatRelativeTime(winner.timestamp)}</div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecentWinners;
