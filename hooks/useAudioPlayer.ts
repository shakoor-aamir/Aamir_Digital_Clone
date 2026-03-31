"use client";

import { useEffect, useRef, useState } from "react";

interface AudioPlayerState {
  isLoading: boolean;
  isPlaying: boolean;
  currentText: string | null;
  error: string | null;
  play: (text: string) => Promise<void>;
  pause: () => void;
  replay: () => Promise<void>;
  stop: () => void;
}

export function useAudioPlayer(): AudioPlayerState {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentText, setCurrentText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  function clearAudioUrl() {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    clearAudioUrl();
    setIsPlaying(false);
    setIsLoading(false);
  }

  function pause() {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.pause();
    setIsPlaying(false);
  }

  async function fetchAndPlay(text: string) {
    stop();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error("Unable to generate audio.");
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audioUrlRef.current = audioUrl;
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        setError("Audio playback failed.");
      };

      setCurrentText(text);
      await audio.play();
      setIsPlaying(true);
    } catch (playError) {
      setError(
        playError instanceof Error ? playError.message : "Audio playback failed."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function play(text: string) {
    if (!text.trim()) {
      return;
    }

    if (currentText === text && audioRef.current) {
      if (isPlaying) {
        pause();
        return;
      }

      setError(null);
      await audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    await fetchAndPlay(text);
  }

  async function replay() {
    if (!currentText) {
      return;
    }

    await fetchAndPlay(currentText);
  }

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return {
    isLoading,
    isPlaying,
    currentText,
    error,
    play,
    pause,
    replay,
    stop
  };
}
