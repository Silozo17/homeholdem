import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  LocalParticipant,
  ParticipantEvent,
  ConnectionState,
} from 'livekit-client';
import { callEdge } from '@/lib/poker/callEdge';
import { toast } from '@/hooks/use-toast';

export interface VoiceChatParticipant {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

interface UseVoiceChatReturn {
  connected: boolean;
  connecting: boolean;
  micMuted: boolean;
  deafened: boolean;
  participants: VoiceChatParticipant[];
  speakingMap: Record<string, boolean>;
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMic: () => void;
  toggleDeafen: () => void;
}

export function useVoiceChat(tableId: string): UseVoiceChatReturn {
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [micMuted, setMicMuted] = useState(true); // start muted
  const [deafened, setDeafened] = useState(false);
  const [participants, setParticipants] = useState<VoiceChatParticipant[]>([]);
  const [speakingMap, setSpeakingMap] = useState<Record<string, boolean>>({});
  const deafenedRef = useRef(false);

  const updateParticipants = useCallback((room: Room) => {
    const parts: VoiceChatParticipant[] = [];
    const speaking: Record<string, boolean> = {};

    const addParticipant = (p: RemoteParticipant | LocalParticipant) => {
      parts.push({
        identity: p.identity,
        name: p.name || p.identity,
        isSpeaking: p.isSpeaking,
        isMuted: !p.isMicrophoneEnabled,
      });
      if (p.isSpeaking) speaking[p.identity] = true;
    };

    addParticipant(room.localParticipant);
    room.remoteParticipants.forEach((p) => addParticipant(p));

    setParticipants(parts);
    setSpeakingMap(speaking);
  }, []);

  const connect = useCallback(async () => {
    if (roomRef.current || connecting) return;
    setConnecting(true);

    try {
      const { token, url } = await callEdge('livekit-token', { table_id: tableId });

      const room = new Room({
        audioCaptureDefaults: { autoGainControl: true, noiseSuppression: true, echoCancellation: true },
        adaptiveStream: true,
        dynacast: true,
      });

      // Listen for participant events
      const onUpdate = () => updateParticipants(room);

      room.on(RoomEvent.ParticipantConnected, onUpdate);
      room.on(RoomEvent.ParticipantDisconnected, onUpdate);
      room.on(RoomEvent.ActiveSpeakersChanged, onUpdate);
      room.on(RoomEvent.TrackMuted, onUpdate);
      room.on(RoomEvent.TrackUnmuted, onUpdate);
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.volume = deafenedRef.current ? 0 : 1;
          document.body.appendChild(el);
        }
        onUpdate();
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
        onUpdate();
      });
      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        roomRef.current = null;
      });

      await room.connect(url, token);

      // Enable mic but start muted
      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(false);
      setMicMuted(true);

      roomRef.current = room;
      setConnected(true);
      updateParticipants(room);
    } catch (err) {
      console.error('[VoiceChat] connect error:', err);
      toast({
        title: 'Voice Chat Error',
        description: 'Could not connect to voice chat. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setConnecting(false);
    }
  }, [tableId, connecting, updateParticipants]);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setConnected(false);
    setParticipants([]);
    setSpeakingMap({});
  }, []);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const newMuted = !micMuted;
    await room.localParticipant.setMicrophoneEnabled(!newMuted);
    setMicMuted(newMuted);
  }, [micMuted]);

  const toggleDeafen = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const newDeafened = !deafened;
    deafenedRef.current = newDeafened;

    // Mute/unmute all remote audio elements
    room.remoteParticipants.forEach((p) => {
      p.audioTrackPublications.forEach((pub) => {
        const track = pub.track;
        if (track) {
          track.attachedElements.forEach((el) => {
            (el as HTMLAudioElement).volume = newDeafened ? 0 : 1;
          });
        }
      });
    });

    setDeafened(newDeafened);
  }, [deafened]);

  // Auto-disconnect on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  return {
    connected,
    connecting,
    micMuted,
    deafened,
    participants,
    speakingMap,
    connect,
    disconnect,
    toggleMic,
    toggleDeafen,
  };
}
