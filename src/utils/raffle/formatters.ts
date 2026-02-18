// Currency and number formatting utilities for raffle display

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('tr-TR').format(num);
};

export const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'az önce';
    } else if (diffInSeconds < 3600) {
        const mins = Math.floor(diffInSeconds / 60);
        return `${mins} dakika önce`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} saat önce`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} gün önce`;
    }
};

export const formatCountdown = (targetDate: Date): string => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();

    if (diff <= 0) {
        return '00:00:00';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
