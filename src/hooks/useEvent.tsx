import { useCallback, useEffect } from 'react';
import { useEventStore } from '../store/events/eventStore';
import { useSnackbar } from 'notistack';
import { EventResponseDTO, EventStatus, EventSearchDTO } from '../types/events/eventModel';

export const useEvent = () => {
  const { enqueueSnackbar } = useSnackbar();
  const {
    events,
    loading,
    error,
    getPopularEvents,
    createEvent,
    createEventAsAdmin,
    updateEvent,
    deleteEvent,
    updateActiveStatus,
  } = useEventStore();

  const fetchPopularEvents = useCallback(async (searchDTO: EventSearchDTO = {}, page: number = 0, size: number = 10) => {
    try {
      await getPopularEvents(searchDTO, page, size);
    } catch (error) {
      enqueueSnackbar('Failed to fetch popular events', { variant: 'error' });
    }
  }, [enqueueSnackbar, getPopularEvents]);

  // Initial fetch can be removed if the component calls it, or kept with defaults. 
  // Since the component calls it in useEffect, we can remove this or leave it as a default load.
  // Ideally, the component controls data fetching. But for backward compatibility or simple usage, we can keep it.
  // HOWEVER, the component `Events.tsx` as I wrote it triggers its own fetch.
  // If I keep this `useEffect`, it will trigger a double fetch on mount (one here, one in component).
  // But other components might rely on this hook auto-fetching.
  // To be safe, I will comment out the auto-fetch or make it optional, or just let it be (it's inefficient but not broken).
  // Actually, I'll remove the `useEffect` here because `Events.tsx` handles it now with specific filters.

  /* 
  useEffect(() => {
    fetchPopularEvents();
  }, []);
  */

  const handleCreateEvent = useCallback(
    async (event: Omit<EventResponseDTO, 'id'>) => {
      try {
        await createEvent(event);
        enqueueSnackbar('Event created successfully', { variant: 'success' });
        // We might not want to Refetch all popular events blindly, but for now it's fine.
        // Or we let the component handle refetch.
      } catch (error) {
        enqueueSnackbar('Failed to create event', { variant: 'error' });
        throw error;
      }
    },
    [createEvent, enqueueSnackbar]
  );

  const handleCreateEventAsAdmin = useCallback(
    async (event: Omit<EventResponseDTO, 'id'>, organizerId: string, image?: File) => {
      try {
        await createEventAsAdmin(event, organizerId, image);
        enqueueSnackbar('Event created successfully on behalf of organizer', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar('Failed to create event', { variant: 'error' });
        throw error;
      }
    },
    [createEventAsAdmin, enqueueSnackbar]
  );

  const handleUpdateEvent = useCallback(
    async (id: string, event: Omit<EventResponseDTO, 'id'>) => {
      try {
        await updateEvent(id, event);
        enqueueSnackbar('Event updated successfully', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar('Failed to update event', { variant: 'error' });
        throw error;
      }
    },
    [updateEvent, enqueueSnackbar]
  );

  const handleDeleteEvent = useCallback(
    async (eventId: string, userId: string) => {
      try {
        await deleteEvent(eventId, userId);
        enqueueSnackbar('Event deleted successfully', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar('Failed to delete event', { variant: 'error' });
        throw error;
      }
    },
    [deleteEvent, enqueueSnackbar]
  );

  const handleUpdateActiveStatus = useCallback(
    async (id: string, status: EventStatus) => {
      try {
        await updateActiveStatus(id, status);
        enqueueSnackbar(
          `Event ${status === EventStatus.ACTIVE ? 'activated' : 'deactivated'} successfully`,
          { variant: 'success' }
        );
      } catch (error) {
        enqueueSnackbar('Failed to update event status', { variant: 'error' });
        throw error;
      }
    },
    [updateActiveStatus, enqueueSnackbar]
  );

  return {
    events,
    loading,
    error,
    getPopularEvents: fetchPopularEvents,
    createEvent: handleCreateEvent,
    createEventAsAdmin: handleCreateEventAsAdmin,
    updateEvent: handleUpdateEvent,
    deleteEvent: handleDeleteEvent,
    updateActiveStatus: handleUpdateActiveStatus,
  };
};
