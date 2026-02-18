import React from 'react';
import { motion } from 'framer-motion';
import { useRaffleStore } from '../../store/raffle/raffleStore';

const Leaderboard: React.FC = () => {
    const participants = useRaffleStore(state => state.participants);

    // Sort by ticket count and get top 10
    const topParticipants = [...participants]
        .sort((a, b) => b.ticketCount - a.ticketCount)
        .slice(0, 10);

    const getTrophyEmoji = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `${rank}`;
    };

    return (
        <div style={{ flex: 1 }}>
            <h3 className="section-title">🏆 En Çok Bilet Alanlar</h3>
            <div className="leaderboard-list">
                {topParticipants.map((participant, index) => {
                    const rank = index + 1;
                    const isTop3 = rank <= 3;

                    return (
                        <motion.div
                            key={participant.id}
                            className={`leaderboard-item ${isTop3 ? 'top-3' : ''}`}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div className="leaderboard-rank">
                                {getTrophyEmoji(rank)}
                            </div>
                            <img
                                src={participant.avatarUrl}
                                alt={participant.name}
                                className="leaderboard-avatar"
                            />
                            <div className="leaderboard-info">
                                <div className="leaderboard-name">{participant.name}</div>
                            </div>
                            <div className="leaderboard-tickets">
                                {participant.ticketCount} bilet
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default Leaderboard;
