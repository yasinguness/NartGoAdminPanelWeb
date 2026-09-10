import { create } from 'zustand';
import { RaffleState, Participant, Winner, RaffleStats } from '../../types/raffle';
import {
    raffleAdminService,
    RaffleCampaign,
    RaffleWinner,
} from '../../services/raffle/raffleAdminService';

/**
 * Canlı çekiliş sahnesi — GERÇEK kampanya verisiyle çalışır.
 *
 * Akış:
 *  1. init(): kampanyaları yükle, aktif olanı seç (entries + winners dahil).
 *  2. startDrawing(count):
 *     - Backend'de henüz çekim yoksa: TEK seferde count kazanan çekilir
 *       (rank 1 = asıl, 2+ = yedek) ve rank 1 sahnede açıklanır.
 *     - Çekim zaten yapılmışsa: backend'e GİTMEDEN sıradaki rank açıklanır
 *       (yanlışlıkla yeniden çekim imkânsız; sayfa yenilense bile kazananlar
 *       yüklenir ve sırayla tekrar açıklanabilir).
 *  3. Tüm kazananlar açıklandıysa yeni basış hata mesajı gösterir.
 */
interface RaffleStore {
    // State
    raffleState: RaffleState;
    campaigns: RaffleCampaign[];
    campaign: RaffleCampaign | null;
    participants: Participant[];
    stats: RaffleStats;
    drawnWinners: RaffleWinner[];
    revealIndex: number;
    currentWinner: Winner | null;
    currentRank: number | null;
    loading: boolean;
    error: string | null;

    // Actions
    init: () => Promise<void>;
    selectCampaign: (campaignId: string) => Promise<void>;
    startDrawing: (count: number) => void;
    resetRaffle: () => void;
}

function toParticipant(userId: string, name?: string | null, email?: string | null, entries?: number): Participant {
    return {
        id: userId,
        name: (name && name.trim()) || email || 'Katılımcı',
        email: email || '',
        ticketCount: entries || 1,
        avatarUrl: '',
    };
}

function toStageWinner(w: RaffleWinner, prize: string): Winner {
    return {
        participant: toParticipant(w.userId, w.displayName, w.email, w.entryCount),
        prize,
        timestamp: new Date(w.drawnAt),
    };
}

export const useRaffleStore = create<RaffleStore>((set, get) => ({
    raffleState: RaffleState.IDLE,
    campaigns: [],
    campaign: null,
    participants: [],
    stats: { totalRevenue: 0, totalTickets: 0, participantCount: 0 },
    drawnWinners: [],
    revealIndex: 0,
    currentWinner: null,
    currentRank: null,
    loading: false,
    error: null,

    // Kampanyaları yükle; aktif (yoksa en yeni) kampanyayı seç.
    init: async () => {
        set({ loading: true, error: null });
        try {
            const campaigns = await raffleAdminService.list();
            set({ campaigns });
            const preferred = campaigns.find((c) => c.status === 'ACTIVE') ?? campaigns[0];
            if (preferred) {
                await get().selectCampaign(preferred.id);
            } else {
                set({ loading: false, error: 'Kampanya bulunamadı. Önce admin panelden kampanya oluşturun.' });
            }
        } catch {
            set({ loading: false, error: 'Kampanyalar yüklenemedi.' });
        }
    },

    selectCampaign: async (campaignId: string) => {
        set({ loading: true, error: null });
        try {
            const [campaign, entries, winners] = await Promise.all([
                raffleAdminService.get(campaignId),
                raffleAdminService.entries(campaignId, 500),
                raffleAdminService.winners(campaignId),
            ]);
            const participants = entries.map((e) =>
                toParticipant(e.userId, e.displayName, e.email, e.entries));
            set({
                campaign,
                participants,
                drawnWinners: winners, // rank asc
                revealIndex: 0, // yenileme sonrası sahnede yeniden açıklanabilsin
                currentWinner: null,
                currentRank: null,
                raffleState: RaffleState.IDLE,
                loading: false,
                stats: {
                    totalRevenue: 0,
                    participantCount: participants.length,
                    totalTickets: participants.reduce((sum, p) => sum + p.ticketCount, 0),
                },
            });
        } catch {
            set({ loading: false, error: 'Kampanya verisi yüklenemedi.' });
        }
    },

    /**
     * count: toplam kazanan sayısı (1 asıl + yedekler). Yalnızca İLK basışta
     * backend çekimi yapılır; sonraki basışlar sıradaki yedeği açıklar.
     */
    startDrawing: (count: number) => {
        const { campaign, participants, drawnWinners, revealIndex } = get();
        if (!campaign) {
            set({ error: 'Önce kampanya seçin.' });
            return;
        }
        if (participants.length === 0) {
            set({ error: 'Bu kampanyada hak kazanan katılımcı yok.' });
            return;
        }
        if (drawnWinners.length > 0 && revealIndex >= drawnWinners.length) {
            set({ error: 'Tüm kazananlar açıklandı. Yeniden çekim için kampanya yönetim sayfasını kullanın.' });
            return;
        }

        set({ raffleState: RaffleState.DRAWING, error: null });

        const revealNext = (winners: RaffleWinner[], index: number) => {
            const w = winners[index];
            set({
                raffleState: RaffleState.CELEBRATING,
                currentWinner: toStageWinner(w, campaign.prize),
                currentRank: w.rank,
                drawnWinners: winners,
                revealIndex: index + 1,
            });
            setTimeout(() => set({ raffleState: RaffleState.WINNER_REVEALED }), 5000);
        };

        if (drawnWinners.length > 0) {
            // Çekim zaten yapılmış → backend'e gitmeden sıradaki rank'ı açıkla.
            setTimeout(() => revealNext(drawnWinners, revealIndex), 4000);
            return;
        }

        // İlk çekim: animasyon (min 4sn) + backend çekimi paralel.
        // force=true: canlı çekim etkinlikte, kampanya penceresi kapanmadan yapılır.
        const minAnimation = new Promise<void>((resolve) => setTimeout(resolve, 4000));
        const drawCall = raffleAdminService.draw(campaign.id, Math.max(1, count), true);

        Promise.all([drawCall, minAnimation])
            .then(([winners]) => {
                if (winners.length === 0) {
                    set({ raffleState: RaffleState.IDLE, error: 'Çekim sonuç döndürmedi.' });
                    return;
                }
                revealNext(winners, 0);
            })
            .catch((e: any) => {
                set({
                    raffleState: RaffleState.IDLE,
                    error: e?.response?.data?.message || 'Çekim başarısız — tekrar deneyin.',
                });
            });
    },

    resetRaffle: () => {
        set({ raffleState: RaffleState.IDLE, currentWinner: null, currentRank: null });
    },
}));
