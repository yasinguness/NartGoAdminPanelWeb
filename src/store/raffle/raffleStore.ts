import { create } from 'zustand';
import { RaffleState, Participant, TicketSale, Winner, RaffleStats } from '../../types/raffle';
import { mockParticipants, mockPrizes } from '../../data/raffle/mockParticipants';

interface RaffleStore {
    // State
    raffleState: RaffleState;
    participants: Participant[];
    ticketSales: TicketSale[];
    winners: Winner[];
    stats: RaffleStats;
    currentWinner: Winner | null;

    // Actions
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
    participants: mockParticipants,
    ticketSales: [],
    winners: [],
    currentWinner: null,
    stats: {
        totalRevenue: 0,
        totalTickets: 0,
        participantCount: mockParticipants.length,
        nextDrawTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
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

        // Select a random prize
        const availablePrizes = mockPrizes.filter(
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
