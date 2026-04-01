import { create } from 'zustand';
import { RaffleState, Participant, TicketSale, Winner, RaffleStats } from '../../types/raffle';
import { api } from '../../services/api';

interface RaffleStore {
    // State
    raffleState: RaffleState;
    participants: Participant[];
    ticketSales: TicketSale[];
    winners: Winner[];
    stats: RaffleStats;
    currentWinner: Winner | null;
    raffleEventId: string | null;

    // Actions
    loadRaffleData: (raffleEventId: string) => Promise<void>;
    startDrawing: () => void;
    selectWinner: () => void;
    resetRaffle: () => void;
    addTicketSale: (sale: TicketSale) => void;
    simulateTicketSales: () => void;
    stopSimulation: () => void;
}

const emojis = ['🚀', '🎉', '⭐', '🎊', '💫', '🔥'];

let simulationInterval: NodeJS.Timeout | null = null;

export const useRaffleStore = create<RaffleStore>((set, get) => ({
    // Initial state
    raffleState: RaffleState.IDLE,
    participants: [],
    ticketSales: [],
    winners: [],
    currentWinner: null,
    raffleEventId: null,
    stats: {
        totalRevenue: 0,
        totalTickets: 0,
        participantCount: 0,
        nextDrawTime: new Date(Date.now() + 15 * 60 * 1000),
    },

    // Load raffle data from API
    loadRaffleData: async (raffleEventId: string) => {
        set({ raffleEventId });
        try {
            const [participantsRes, winnersRes] = await Promise.allSettled([
                api.get(`/raffle/events/${raffleEventId}/participants`),
                api.get(`/raffle/events/${raffleEventId}/winners`),
            ]);
            const participants = participantsRes.status === 'fulfilled'
                ? (participantsRes.value.data?.data || []).map((p: any) => ({
                    id: p.id || p.userId || String(Math.random()),
                    name: p.name || p.displayName || p.email || 'Katılımcı',
                    ticketCount: p.ticketCount || 1,
                    avatarUrl: p.avatarUrl || p.imageUrl,
                    joinedAt: p.joinedAt || p.createdAt,
                  }))
                : [];
            const winners = winnersRes.status === 'fulfilled'
                ? (winnersRes.value.data?.data || []).map((w: any) => ({
                    participant: {
                      id: w.participantId || w.userId || '',
                      name: w.participantName || w.name || '',
                      ticketCount: w.ticketCount || 1,
                    },
                    prize: w.prize || w.prizeName || '',
                    timestamp: w.timestamp || w.drawnAt || new Date().toISOString(),
                    emoji: emojis[Math.floor(Math.random() * emojis.length)],
                  }))
                : [];
            set({
                participants,
                winners,
                stats: {
                    ...get().stats,
                    participantCount: participants.length,
                    totalTickets: participants.reduce((sum: number, p: any) => sum + (p.ticketCount || 1), 0),
                },
            });
        } catch {
            // silently handle — keep empty state
        }
    },

    // Start the raffle drawing animation
    startDrawing: () => {
        set({ raffleState: RaffleState.DRAWING });

        // Automatically select winner after 3-5 seconds
        setTimeout(() => {
            get().selectWinner();
        }, 4000);
    },

    // Select a random winner
    selectWinner: () => {
        const { participants, winners } = get();

        // Create weighted array based on ticket counts
        const weightedParticipants: Participant[] = [];
        participants.forEach(participant => {
            for (let i = 0; i < participant.ticketCount; i++) {
                weightedParticipants.push(participant);
            }
        });

        // Randomly select
        const randomIndex = Math.floor(Math.random() * weightedParticipants.length);
        const selectedParticipant = weightedParticipants[randomIndex];

        // Select a random prize from defaults
        const defaultPrizes = ['Büyük Ödül', 'VIP Bilet', 'Hediye Çeki', 'Özel Paket', 'Sürpriz Hediye'];
        const availablePrizes = defaultPrizes.filter(
            prize => !winners.find(w => w.prize === prize)
        );
        const randomPrize = availablePrizes[Math.floor(Math.random() * availablePrizes.length)] || 'Özel Hediye';

        const winner: Winner = {
            participant: selectedParticipant,
            prize: randomPrize,
            timestamp: new Date(),
        };

        set({
            raffleState: RaffleState.CELEBRATING,
            currentWinner: winner,
        });

        // After celebration, move to winner revealed state
        setTimeout(() => {
            set(state => ({
                raffleState: RaffleState.WINNER_REVEALED,
                winners: [winner, ...state.winners].slice(0, 10), // Keep last 10 winners
            }));
        }, 5000);
    },

    // Reset raffle to idle state
    resetRaffle: () => {
        set({
            raffleState: RaffleState.IDLE,
            currentWinner: null,
        });
    },

    // Add a new ticket sale to the feed
    addTicketSale: (sale: TicketSale) => {
        set(state => {
            const newStats = {
                ...state.stats,
                totalTickets: state.stats.totalTickets + sale.ticketCount,
                totalRevenue: state.stats.totalRevenue + (sale.ticketCount * 50), // Assuming 50 TL per ticket
            };

            return {
                ticketSales: [sale, ...state.ticketSales].slice(0, 50), // Keep last 50
                stats: newStats,
            };
        });
    },

    // Simulate ticket sales for demo
    simulateTicketSales: () => {
        if (simulationInterval) return; // Already running

        simulationInterval = setInterval(() => {
            const { participants, addTicketSale } = get();
            const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
            const ticketCount = Math.floor(Math.random() * 5) + 1;
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];

            const sale: TicketSale = {
                userId: randomParticipant.id,
                userName: randomParticipant.name,
                userEmail: randomParticipant.email,
                ticketCount,
                timestamp: new Date(),
                emoji,
            };

            addTicketSale(sale);
        }, 3000); // New sale every 3 seconds
    },

    // Stop ticket sale simulation
    stopSimulation: () => {
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
        }
    },
}));
