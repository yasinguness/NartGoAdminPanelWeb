// Raffle-related type definitions

export enum RaffleState {
  IDLE = 'idle',
  DRAWING = 'drawing',
  CELEBRATING = 'celebrating',
  WINNER_REVEALED = 'winner_revealed',
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  ticketCount: number;
  avatarUrl: string;
}

export interface TicketSale {
  userId: string;
  userName: string;
  userEmail: string;
  ticketCount: number;
  timestamp: Date;
  emoji: string;
}

export interface Winner {
  participant: Participant;
  prize: string;
  timestamp: Date;
}

export interface RaffleStats {
  totalRevenue: number;
  totalTickets: number;
  participantCount: number;
  nextDrawTime?: Date;
}
