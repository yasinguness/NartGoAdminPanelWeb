import { Participant } from '../../types/raffle';

// Önce isimleri oluştur
const names = [
    'Ahmet Yılmaz', 'Mehmet Demir', 'Ayşe Kaya', 'Fatma Şahin', 'Ali Öztürk',
    'Zeynep Arslan', 'Mustafa Koç', 'Emine Yıldız', 'Hüseyin Aydın', 'Hatice Özkan',
    'İbrahim Kara', 'Ramazan Çelik', 'Elif Şimşek', 'Yusuf Polat', 'Merve Erdoğan',
    'Ömer Yıldırım', 'Selin Acar', 'Can Özdemir', 'Derya Kılıç', 'Burak Güneş',
    'Dilara Kurt', 'Emre Yavuz', 'Gamze Doğan', 'Hakan Bulut', 'İrem Aksoy',
    'Kemal Taş', 'Leman Sönmez', 'Murat Bozkurt', 'Nalan Türk', 'Okan Çakır',
    'Pınar Aslan', 'Recep Kaplan', 'Sevgi Uçar', 'Taner Özmen', 'Ufuk Soylu',
    'Vildan Eren', 'Yakup Tekin', 'Zeliha Çetin', 'Baran İnan', 'Canan Uzun',
    'Deniz Özel', 'Eren Kaya', 'Figen Sarı', 'Gökhan Beyaz', 'Hacer Yıldız',
    'İsmail Güler', 'Jale Aydın', 'Kamil Yaman', 'Leyla Öztürk', 'Mete Kara'
];

// Email oluşturma fonksiyonu
const createEmail = (name: string, index: number): string => {
    const cleanName = name
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .split(' ');

    const firstName = cleanName[0];
    const lastName = cleanName[1] || '';

    return `${firstName}.${lastName}${index > 10 ? index : ''}@gmail.com`;
};

// Mock Turkish names and participants for raffle demonstration
export const mockParticipants: Participant[] = names.map((name, index) => ({
    id: String(index + 1),
    name,
    email: createEmail(name, index + 1),
    ticketCount: Math.floor(Math.random() * 10) + 5,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
}));

export const mockPrizes = [
    'iPhone 15 Pro Max',
    'iPad Air',
    'AirPods Pro',
    'Apple Watch Series 9',
    'MacBook Air',
    'PlayStation 5',
    'Samsung Galaxy S24',
    'Bose Headphones',
    'GoPro Hero 12',
    'Dyson Airwrap',
];
