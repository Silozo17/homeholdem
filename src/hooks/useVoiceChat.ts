import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  LocalParticipant,
} from 'livekit-client';
import { callEdge } from '@/lib/poker/callEdge';

export interface VoiceChatParticipant {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

interface UseVoiceChatReturn {
  connected: boolean;
  connecting: boolean;
  failed: boolean;
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
  const [failed, setFailed] = useState(false);
  const failedRef = useRef(false);
  const [micMuted, setMicMuted] = useState(true); // start muted
  const [deafened, setDeafened] = useState(false);
  const [participants, setParticipants] = useState<VoiceChatParticipant[]>([]);
  const [speakingMap, setSpeakingMap] = useState<Record<string, boolean>>({});
  const deafenedRef = useRef(false);
  // Store all appended audio elements so toggleDeafen can reliably control them
  const audioElementsRef = useRef<Set<HTMLAudioElement>>(new Set());

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

  const connectAttemptedRef = useRef(false);

  const connect = useCallback(async (manual?: boolean) => {
    if (roomRef.current || connecting) return;
    if (manual) { failedRef.current = false; setFailed(false); connectAttemptedRef.current = false; }
    if (connectAttemptedRef.current) return;
    connectAttemptedRef.current = true;
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
          // Respect current deafen state for newly subscribed tracks
          el.volume = deafenedRef.current ? 0 : 1;
          document.body.appendChild(el);
          // Store reference for toggleDeafen
          audioElementsRef.current.add(el);
        }
        onUpdate();
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        const detached = track.detach();
        detached.forEach((el) => {
          el.remove();
          audioElementsRef.current.delete(el as HTMLAudioElement);
        });
        onUpdate();
      });
      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        roomRef.current = null;
        audioElementsRef.current.clear();
      });

      await room.connect(url, token);

      // Enable mic but start muted — graceful fallback if permission denied
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(false);
      } catch (micErr) {
        console.warn('[VoiceChat] Mic permission denied, joining listen-only:', micErr);
      }
      setMicMuted(true);

      roomRef.current = room;
      setConnected(true);
      updateParticipants(room);
    } catch (err) {
      console.error('[VoiceChat] connect error:', err);
      failedRef.current = true;
      setFailed(true);
    } finally {
      setConnecting(false);
    }
  }, [tableId, connecting, updateParticipants]);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    audioElementsRef.current.clear();
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

    // Mute/unmute ALL tracked audio elements (reliable reference)
    audioElementsRef.current.forEach((el) => {
      el.volume = newDeafened ? 0 : 1;
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
      audioElementsRef.current.clear();
    };
  }, []);

  return {
    connected,
    connecting,
    failed,
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
