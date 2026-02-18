import { List } from "@mui/material";
import { AddressDTO } from "../businesses/addressModel";

export interface AssociationEventSummary {
    upcomingEvents: UpcomingEvent[];
    completedEvents: UpcomingEvent[];
}

export interface UpcomingEvent {
    id: string;
    title: string;
    //final String? category;
    eventTime: Date;
    address: AddressDTO;
    imageUrl: string;
    description: string;
    distance: string;
   // participations: EventParticipant[];
    maxParticipants: number;
}