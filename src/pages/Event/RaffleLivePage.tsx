import React, { useEffect, useState } from 'react';
import { useRaffleStore } from '../../store/raffle/raffleStore';
import { RaffleState } from '../../types/raffle';
import { formatNumber } from '../../utils/raffle/formatters';
import { Maximize, Minimize, Users, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import './RaffleLive.css';

const RaffleLivePage: React.FC = () => {
    const { stats, raffleState, currentWinner, startDrawing, resetRaffle, simulateTicketSales, stopSimulation } = useRaffleStore();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [qrZoomed, setQrZoomed] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [cyclingName, setCyclingName] = useState('');
    const participants = useRaffleStore(state => state.participants);
    const ticketSales = useRaffleStore(state => state.ticketSales);

    useEffect(() => {
        simulateTicketSales();
        return () => stopSimulation();
    }, [simulateTicketSales, stopSimulation]);

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Cycle through participant names during drawing
    useEffect(() => {
        if (raffleState === RaffleState.DRAWING) {
            const interval = setInterval(() => {
                const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
                setCyclingName(randomParticipant.name);
            }, 100);
            return () => clearInterval(interval);
        }
    }, [raffleState, participants]);

    // Keyboard controls
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

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const toggleQrZoom = () => {
        setQrZoomed(!qrZoomed);

        if (!qrZoomed) {
            setTimeout(() => {
                setQrZoomed(false);
            }, 8000);
        }
    };

    // QR Component
    const QRCodeComponent = () => (
        <>
            <motion.div
                className="qr-fixed"
                onClick={toggleQrZoom}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://nartgo.net"
                    alt="NartGo QR"
                    className="qr-code-image"
                />
                <div className="qr-label">📱 NartGo İndir</div>
            </motion.div>

            <AnimatePresence>
                {qrZoomed && (
                    <motion.div
                        className="qr-overlay"
                        onClick={toggleQrZoom}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="qr-popup"
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 10 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src="https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=https://nartgo.net"
                                alt="NartGo QR"
                                className="qr-code-image"
                            />
                            <div className="qr-label">📱 NartGo İndir</div>
                            <div className="qr-close-hint">Kapatmak için tıklayın</div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );

    // Compact Stats Component
    const CompactStatsComponent = () => (
        <motion.div
            className="stats-compact"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
        >
            <div className="stat-badge">
                <Users size={24} className="stat-badge-icon" />
                <div className="stat-badge-content">
                    <div className="stat-badge-value">{formatNumber(stats.participantCount)}</div>
                    <div className="stat-badge-label">Katılımcı</div>
                </div>
            </div>
            <div className="stat-badge">
                <Ticket size={24} className="stat-badge-icon" />
                <div className="stat-badge-content">
                    <div className="stat-badge-value">{formatNumber(stats.totalTickets)}</div>
                    <div className="stat-badge-label">Bilet</div>
                </div>
            </div>
        </motion.div>
    );

    // Render Drawing State
    if (raffleState === RaffleState.DRAWING) {
        return (
            <div className="raffle-overlay-kahoot">
                <div className="cycling-names-kahoot">
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
        );
    }

    // Render Celebrating State
    if (raffleState === RaffleState.CELEBRATING && currentWinner) {
        return (
            <div className="raffle-overlay-kahoot">
                <Confetti
                    width={windowSize.width}
                    height={windowSize.height}
                    numberOfPieces={500}
                    recycle={false}
                    colors={['#16461C', '#4C8B53', '#2D5A33', '#ffffff']}
                />
                <motion.div
                    className="winner-reveal-kahoot"
                    initial={{ scale: 0, rotate: -10, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ duration: 1, type: 'spring', bounce: 0.5 }}
                >
                    <div className="winner-card-kahoot">
                        <div className="winner-emoji-large">🎉</div>
                        <div className="winner-name-kahoot">{currentWinner.participant.name}</div>
                        <div className="winner-email-kahoot">{currentWinner.participant.email}</div>
                        <div className="winner-prize-kahoot">{currentWinner.prize}</div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Render Winner Revealed State
    if (raffleState === RaffleState.WINNER_REVEALED && currentWinner) {
        return (
            <div className="raffle-live-container">
                <button className="fullscreen-toggle-kahoot" onClick={toggleFullscreen}>
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    {isFullscreen ? 'Çıkış' : 'Tam Ekran'}
                </button>

                <div className="raffle-content">
                    <div className="winner-card-kahoot">
                        <div className="winner-emoji-large">🏆</div>
                        <div className="winner-name-kahoot">{currentWinner.participant.name}</div>
                        <div className="winner-email-kahoot">{currentWinner.participant.email}</div>
                        <div className="winner-prize-kahoot">{currentWinner.prize}</div>
                    </div>
                    <div style={{ marginTop: '2rem', fontSize: '1.5rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                        Yeni çekiliş için <kbd style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 700 }}>SPACE</kbd> tuşuna basın
                    </div>
                </div>

                <QRCodeComponent />
            </div>
        );
    }

    // Render Idle State (Main Dashboard) - NEW LAYOUT
    return (
        <div className="raffle-live-container">
            {/* Fullscreen Toggle - Top Left */}
            <button className="fullscreen-toggle-kahoot" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                {isFullscreen ? 'Çıkış' : 'Tam Ekran'}
            </button>

            {/* Compact Stats - Top Right */}
            <CompactStatsComponent />

            {/* Main Content */}
            <div className="raffle-content">
                {/* Live Feed Header */}
                <motion.div
                    className="live-feed-header"
                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="live-feed-title-large">
                        <span className="live-indicator-large"></span>
                        CANLI KATILIMCILAR
                    </div>
                </motion.div>

                {/* Participants Grid - Wrapped Layout */}
                <div className="participants-grid">
                    <AnimatePresence initial={false}>
                        {ticketSales.slice(0, 20).map((sale, index) => (
                            <motion.div
                                key={`${sale.userId}-${sale.timestamp.getTime()}`}
                                className={`participant-card ${index === 0 ? 'new-entry' : ''}`}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.02 }}
                            >
                                <div className="participant-emoji">{sale.emoji}</div>
                                <div className="participant-name">{sale.userName}</div>
                                <div className="participant-email">{sale.userEmail}</div>
                                <div className="participant-tickets">
                                    ×{sale.ticketCount}
                                    <div className="participant-tickets-label">Bilet</div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {ticketSales.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem', width: '100%' }}>
                            Bilet satışı bekleniyor...
                        </div>
                    )}
                </div>

                {/* Start Button */}
                <motion.button
                    className="start-button-kahoot"
                    onClick={startDrawing}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    🎰 Çekilişi Başlat
                </motion.button>
            </div>

            <QRCodeComponent />

            {/* Instructions */}
            <motion.div
                className="instructions"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
            >
                <kbd>SPACE</kbd> Çekiliş Başlat
            </motion.div>
        </div>
    );
};

export default RaffleLivePage;
