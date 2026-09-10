import React, { useEffect, useState } from 'react';
import { useRaffleStore } from '../../store/raffle/raffleStore';
import { RaffleState } from '../../types/raffle';
import { formatNumber } from '../../utils/raffle/formatters';
import { Maximize, Minimize, Users, Ticket, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import './RaffleLive.css';

/**
 * Canlı çekiliş sahnesi — GERÇEK kampanya verisi (raffle_campaigns).
 * Katılımcılar = kampanya penceresinde XP ile hak kazananlar (hak = bilet).
 * Çekim backend'de yapılır (ağırlıklı, denetlenebilir); sahne yalnızca
 * animasyon + sıralı açıklama yapar (1 asıl, sonra yedekler).
 */
const RaffleLivePage: React.FC = () => {
    const {
        stats,
        raffleState,
        currentWinner,
        currentRank,
        startDrawing,
        resetRaffle,
        init,
        campaigns,
        campaign,
        selectCampaign,
        participants,
        drawnWinners,
        revealIndex,
        loading,
        error,
    } = useRaffleStore();

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [qrZoomed, setQrZoomed] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [cyclingName, setCyclingName] = useState('');
    const [drawCount, setDrawCount] = useState(3);

    useEffect(() => {
        init();
    }, [init]);

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

    // Çekim animasyonu sırasında gerçek katılımcı isimleri döner
    useEffect(() => {
        if (raffleState === RaffleState.DRAWING && participants.length > 0) {
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
                    startDrawing(drawCount);
                } else if (raffleState === RaffleState.WINNER_REVEALED) {
                    resetRaffle();
                }
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [raffleState, startDrawing, resetRaffle, drawCount]);

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

    const rankLabel = currentRank === 1 ? campaign?.prize ?? '' : `${currentRank}. Yedek`;

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
                    <div className="stat-badge-label">Hak</div>
                </div>
            </div>
            {drawnWinners.length > 0 && (
                <div className="stat-badge">
                    <Trophy size={24} className="stat-badge-icon" />
                    <div className="stat-badge-content">
                        <div className="stat-badge-value">
                            {revealIndex}/{drawnWinners.length}
                        </div>
                        <div className="stat-badge-label">Açıklanan</div>
                    </div>
                </div>
            )}
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
                        <div className="winner-emoji-large">{currentRank === 1 ? '🎉' : '🎟️'}</div>
                        <div className="winner-name-kahoot">{currentWinner.participant.name}</div>
                        <div className="winner-email-kahoot">{currentWinner.participant.email}</div>
                        <div className="winner-prize-kahoot">{rankLabel}</div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Render Winner Revealed State
    if (raffleState === RaffleState.WINNER_REVEALED && currentWinner) {
        const hasMore = revealIndex < drawnWinners.length;
        return (
            <div className="raffle-live-container">
                <button className="fullscreen-toggle-kahoot" onClick={toggleFullscreen}>
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    {isFullscreen ? 'Çıkış' : 'Tam Ekran'}
                </button>

                <div className="raffle-content">
                    <div className="winner-card-kahoot">
                        <div className="winner-emoji-large">{currentRank === 1 ? '🏆' : '🎟️'}</div>
                        <div className="winner-name-kahoot">{currentWinner.participant.name}</div>
                        <div className="winner-email-kahoot">{currentWinner.participant.email}</div>
                        <div className="winner-prize-kahoot">{rankLabel}</div>
                    </div>
                    <div style={{ marginTop: '2rem', fontSize: '1.5rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                        {hasMore ? (
                            <>Sıradaki yedek için <kbd style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 700 }}>SPACE</kbd> → ana ekran, tekrar SPACE → çekim</>
                        ) : (
                            <>Tüm kazananlar açıklandı 🎊 <kbd style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 700 }}>SPACE</kbd> ile ana ekrana dönün</>
                        )}
                    </div>
                </div>

                <QRCodeComponent />
            </div>
        );
    }

    // Render Idle State (Main Dashboard)
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
                {/* Kampanya başlığı + seçim */}
                <motion.div
                    className="live-feed-header"
                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="live-feed-title-large">
                        <span className="live-indicator-large"></span>
                        {campaign ? `${campaign.name} · ${campaign.prize}` : 'CANLI ÇEKİLİŞ'}
                    </div>
                    {campaigns.length > 1 && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <select
                                value={campaign?.id ?? ''}
                                onChange={(e) => selectCampaign(e.target.value)}
                                style={{
                                    background: 'rgba(255,255,255,0.12)', color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8,
                                    padding: '0.4rem 0.8rem', fontSize: '0.95rem',
                                }}
                            >
                                {campaigns.map((c) => (
                                    <option key={c.id} value={c.id} style={{ color: '#16461C' }}>
                                        {c.name} ({c.status})
                                    </option>
                                ))}
                            </select>
                            {drawnWinners.length === 0 && (
                                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    Kazanan+yedek:
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={drawCount}
                                        onChange={(e) => setDrawCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                                        style={{
                                            width: 56, background: 'rgba(255,255,255,0.12)', color: '#fff',
                                            border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8,
                                            padding: '0.35rem 0.5rem', fontSize: '0.95rem',
                                        }}
                                    />
                                </label>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* Hata / bilgi */}
                {error && (
                    <div style={{
                        margin: '0.75rem auto', padding: '0.6rem 1.2rem', maxWidth: 640,
                        background: 'rgba(200,60,60,0.25)', border: '1px solid rgba(255,120,120,0.5)',
                        borderRadius: 10, color: '#ffd9d9', fontWeight: 600, textAlign: 'center',
                    }}>
                        {error}
                    </div>
                )}

                {/* Katılımcılar (gerçek hak sahipleri, hak sayısına göre) */}
                <div className="participants-grid">
                    <AnimatePresence initial={false}>
                        {participants.slice(0, 20).map((p, index) => (
                            <motion.div
                                key={p.id}
                                className="participant-card"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.02 }}
                            >
                                <div className="participant-emoji">🎟️</div>
                                <div className="participant-name">{p.name}</div>
                                <div className="participant-email">{p.email}</div>
                                <div className="participant-tickets">
                                    ×{p.ticketCount}
                                    <div className="participant-tickets-label">Hak</div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {participants.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem', width: '100%' }}>
                            {loading ? 'Katılımcılar yükleniyor…' : 'Henüz hak kazanan katılımcı yok — XP toplandıkça burada görünecek.'}
                        </div>
                    )}
                </div>

                {/* Start Button */}
                <motion.button
                    className="start-button-kahoot"
                    onClick={() => startDrawing(drawCount)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    {drawnWinners.length === 0
                        ? '🎰 Çekilişi Başlat'
                        : revealIndex < drawnWinners.length
                            ? `🎟️ Sıradaki Kazananı Açıkla (${revealIndex + 1}/${drawnWinners.length})`
                            : '🏆 Tüm Kazananlar Açıklandı'}
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
                <kbd>SPACE</kbd> {drawnWinners.length === 0 ? 'Çekiliş Başlat' : 'Sıradaki Kazanan'}
            </motion.div>
        </div>
    );
};

export default RaffleLivePage;
