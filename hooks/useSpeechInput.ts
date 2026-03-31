"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface SpeechInputState {
  isReady: boolean;
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechInput(): SpeechInputState {
  const [isReady, setIsReady] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");

  useEffect(() => {
    const SpeechRecognitionApi =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    setIsReady(true);
    setIsSupported(Boolean(SpeechRecognitionApi));

    if (!SpeechRecognitionApi) {
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);

      if (event.error === "not-allowed") {
        setError("Microphone permission was denied.");
        return;
      }

      if (event.error === "no-speech") {
        setError("No speech detected. Please try again.");
        return;
      }

      setError("Voice input failed. Please try again.");
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const resultTranscript = result[0].transcript.trim();

        if (!resultTranscript) {
          continue;
        }

        if (result.isFinal) {
          finalTranscriptRef.current = [
            finalTranscriptRef.current.trim(),
            resultTranscript
          ]
            .filter(Boolean)
            .join(" ");
        } else {
          interimTranscript = [interimTranscript, resultTranscript]
            .filter(Boolean)
            .join(" ");
        }
      }

      setTranscript(
        [finalTranscriptRef.current.trim(), interimTranscript.trim()]
          .filter(Boolean)
          .join(" ")
          .trim()
      );
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  function startListening() {
    if (!recognitionRef.current) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    finalTranscriptRef.current = "";
    setTranscript("");
    setError(null);
    recognitionRef.current.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  function resetTranscript() {
    finalTranscriptRef.current = "";
    setTranscript("");
  }

  return {
    isReady,
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
}
