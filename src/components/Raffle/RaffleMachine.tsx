import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useRaffleStore } from '../../store/raffle/raffleStore';
import { RaffleState } from '../../types/raffle';

const RaffleMachine: React.FC = () => {
    const { raffleState, participants, currentWinner, startDrawing, resetRaffle } = useRaffleStore();
    const [cyclingName, setCyclingName] = useState('');
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Cycle through names during drawing
    useEffect(() => {
        if (raffleState === RaffleState.DRAWING) {
            const interval = setInterval(() => {
                const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
                setCyclingName(randomParticipant.name);
            }, 100); // Change name every 100ms

            return () => clearInterval(interval);
        }
    }, [raffleState, participants]);

    // Handle space bar press
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (raffleState === RaffleState.IDLE) {
                    startDrawing();
                } else if (raffleState === RaffleState.WINNER_REVEALED) {
                    resetRaffle();
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [raffleState, startDrawing, resetRaffle]);

    if (raffleState === RaffleState.IDLE) {
        return (
            <motion.button
                className="start-button"
                onClick={startDrawing}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                🎰 Çekilişi Başlat
            </motion.button>
        );
    }

    if (raffleState === RaffleState.DRAWING) {
        return (
            <div className="raffle-overlay">
                <div className="raffle-machine">
                    <div className="cycling-names">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={cyclingName}
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -50 }}
                                transition={{ duration: 0.1 }}
                            >
                                {cyclingName}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        );
    }

    if (raffleState === RaffleState.CELEBRATING && currentWinner) {
        return (
            <div className="raffle-overlay">
                <Confetti
                    width={windowSize.width}
                    height={windowSize.height}
                    numberOfPieces={500}
                    recycle={false}
                />
                <motion.div
                    className="winner-reveal"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, type: 'spring' }}
                >
                    <div className="winner-card-large">
                        <img
                            src={currentWinner.participant.avatarUrl}
                            alt={currentWinner.participant.name}
                            className="winner-avatar-large"
                        />
                        <div className="winner-name-large">
                            🎉 {currentWinner.participant.name}
                        </div>
                        <div className="winner-prize-large">
                            {currentWinner.prize}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (raffleState === RaffleState.WINNER_REVEALED && currentWinner) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: 'center' }}
            >
                <div className="winner-card-large" style={{ display: 'inline-block' }}>
                    <img
                        src={currentWinner.participant.avatarUrl}
                        alt={currentWinner.participant.name}
                        className="winner-avatar-large"
                    />
                    <div className="winner-name-large">
                        {currentWinner.participant.name}
                    </div>
                    <div className="winner-prize-large">
                        {currentWinner.prize}
                    </div>
                </div>
                <div style={{ marginTop: '2rem', fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)' }}>
                    Yeni çekiliş için Space tuşuna basın
                </div>
            </motion.div>
        );
    }

    return null;
};

export default RaffleMachine;
