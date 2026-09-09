import { apiFetch, apiUrl } from '../config/api';
import { LanguageCode } from '../types';

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private sarvamAudio: HTMLAudioElement | null = null;
  private speakToken = 0;

  /** True when the given token is still the most recent speak() call. */
  private isCurrent(token: number): boolean {
    return token === this.speakToken;
  }

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.refreshVoices();
      this.synth.addEventListener('voiceschanged', () => this.refreshVoices());
    }
  }

  private refreshVoices(): void {
    if (this.synth) this.voices = this.synth.getVoices();
  }

  public getLanguageCodeBCP47(lang: LanguageCode): string {
    const map: { [key in LanguageCode]: string } = {
      en: 'en-IN',
      hi: 'hi-IN',
      te: 'te-IN',
      ta: 'ta-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      mr: 'mr-IN',
    };
    return map[lang] || 'en-IN';
  }

  public speak(
    text: string,
    language: LanguageCode = 'en',
    onStart?: () => void,
    onEnd?: () => void,
    allowDefaultVoiceFallback = true
  ): boolean {
    this.stop();
    const token = ++this.speakToken;

    // Prefer Sarvam Bulbul v3 TTS for natural Indic voices. If it succeeds,
    // playback is handled by the returned audio element. The browser
    // SpeechSynthesis engine is only used as a fallback when this call is
    // still the active/latest one (avoids overlapping voices).
    this.speakWithSarvam(text, language, onStart, onEnd, token).then((status) => {
      if (status === 'played' || status === 'superseded') return;
      this.speakWithBrowserSynth(text, language, onStart, onEnd, allowDefaultVoiceFallback, token);
    });

    return true;
  }

  private speakWithBrowserSynth(
    text: string,
    language: LanguageCode = 'en',
    onStart?: () => void,
    onEnd?: () => void,
    allowDefaultVoiceFallback = true,
    token?: number
  ): boolean {
    if (!this.synth) {
      if (token === undefined || this.isCurrent(token)) {
        if (onEnd) onEnd();
      }
      return false;
    }

    this.synth.cancel();
    this.refreshVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.getLanguageCodeBCP47(language);
    utterance.rate = 0.95; // Slightly slower for low-literacy clarity
    const targetBcp47 = this.getLanguageCodeBCP47(language);
    utterance.lang = targetBcp47;
    utterance.rate = 0.92; // Clear, deliberate cadence for clinical kiosk
    utterance.pitch = 1.0;

    // Try to find a matching natural regional voice using 3-tier matching
    const voices = this.voices.length > 0 ? this.voices : this.synth.getVoices();
    const langPrefix = language.toLowerCase();
    const targetPrefix = targetBcp47.toLowerCase();

    // 1. Exact BCP-47 match (e.g. 'hi-IN', 'ta-IN')
    let matchingVoice = voices.find((v) => v.lang.toLowerCase() === targetPrefix);
    
    // 2. Language prefix match (e.g. 'hi', 'ta')
    if (!matchingVoice) {
      matchingVoice = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
    }

    // 3. Name match for regional voice (e.g. 'Hindi', 'Tamil', 'Google हिन्दी')
    if (!matchingVoice) {
      matchingVoice = voices.find((v) => 
        v.name.toLowerCase().includes(langPrefix) || 
        v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix)
      );
    }

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => {
      if (token !== undefined && !this.isCurrent(token)) return;
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (token !== undefined && !this.isCurrent(token)) return;
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      console.warn('SpeechSynthesis error: unable to use the selected regional voice.');
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (token !== undefined && !this.isCurrent(token)) return;
      if (matchingVoice && allowDefaultVoiceFallback) {
        this.speakWithBrowserSynth(text, language, onStart, onEnd, false, token);
      } else if (onEnd) {
        onEnd();
      }
    };

    if (token !== undefined && !this.isCurrent(token)) return false;

    this.currentUtterance = utterance;
    this.synth.resume();
    this.synth.speak(utterance);
    return true;
  }

  public stop(): void {
    // Invalidate any in-flight TTS so a late-arriving Sarvam audio or a stale
    // browser utterance never starts playing after stop().
    this.speakToken++;

    if (this.synth) {
      this.synth.cancel();
    }
    if (this.sarvamAudio) {
      try {
        this.sarvamAudio.pause();
        this.sarvamAudio.src = '';
      } catch {
        // ignore
      }
      this.sarvamAudio = null;
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  // Voice recognition wrapper using browser SpeechRecognition
  public createRecognition(
    language: LanguageCode,
    onResult: (transcript: string, isFinal: boolean) => void,
    onError?: (err: any) => void,
    onEnd?: () => void
  ): { start: () => void; stop: () => void; isSupported: boolean } {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return {
        start: () => {
          if (onError) onError(new Error('Speech recognition not supported in this browser.'));
        },
        stop: () => {},
        isSupported: false,
      };
    }

    const recognition = new SpeechRecognition();
    recognition.lang = this.getLanguageCodeBCP47(language);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onResult(finalTranscript, true);
      } else if (interim) {
        onResult(interim, false);
      }
    };

    recognition.onerror = (err: any) => {
      console.warn('Recognition error:', err);
      if (onError) onError(err);
    };

    recognition.onend = () => {
      if (onEnd) onEnd();
    };

    return {
      start: () => {
        try {
          recognition.start();
        } catch (e) {
          console.warn('Recognition start exception:', e);
        }
      },
      stop: () => {
        try {
          recognition.stop();
        } catch (e) {
          console.warn('Recognition stop exception:', e);
        }
      },
      isSupported: true,
    };
  }

  /**
   * Tap-to-talk voice input with provider cascade (Sarvam -> Bhashini -> browser).
   *
   * Records mic audio as 16 kHz mono PCM via AudioContext + ScriptProcessorNode,
   * encodes it to a WAV blob, then runs `transcribeWithAI` on release.
   */
  public recordAndTranscribe(
    language: LanguageCode,
    onResult: (text: string, source: 'sarvam' | 'bhashini' | 'browser') => void,
    onError?: (err: any) => void
  ): { start: () => boolean; stop: () => void; isSupported: boolean } {
    if (
      typeof window === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      (!window.AudioContext && !(window as any).webkitAudioContext)
    ) {
      return {
        start: () => false,
        stop: () => {},
        isSupported: false,
      };
    }

    let recording = false;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let processor: ScriptProcessorNode | null = null;
    let samples: Float32Array[] = [];
    let sampleRate = 16000;

    return {
      isSupported: true,
      start: () => {
        if (recording) return true;
        samples = [];

        (async () => {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
            });
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            audioCtx = new Ctx({ sampleRate: 16000 });
            sampleRate = audioCtx.sampleRate || 16000;
            sourceNode = audioCtx.createMediaStreamSource(stream);
            processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const mono = e.inputBuffer.getChannelData(0);
              samples.push(new Float32Array(mono));
            };
            sourceNode.connect(processor);
            processor.connect(audioCtx.destination);
            recording = true;
          } catch (err) {
            console.warn('[Speech] Mic capture failed:', err);
            recording = false;
            if (onError) onError(err);
          }
        })();

        return true;
      },
      stop: () => {
        if (!recording) return;
        recording = false;

        try {
          if (processor) {
            processor.onaudioprocess = null;
            processor.disconnect();
          }
          if (sourceNode) sourceNode.disconnect();
          if (stream) stream.getTracks().forEach((t) => t.stop());
          if (audioCtx) void audioCtx.close();
        } catch {
          // ignore cleanup errors
        }

        (async () => {
          try {
            const pcm = this.encodeWavFromSamples(samples, sampleRate);
            await this.transcribeWithAI(pcm, language).then(({ transcript, source }) => {
              if (transcript && transcript.trim()) {
                onResult(transcript.trim(), source);
              } else if (onError) {
                onError(new Error('Speech-to-text returned no transcript.'));
              }
            });
          } catch (err) {
            console.warn('[Speech] Transcription failed:', err);
            if (onError) onError(err);
          }
        })();
      },
    };
  }

  /** Encode accumulated Float32 PCM samples (raw, any rate) into a 16 kHz 16-bit WAV blob. */
  private encodeWavFromSamples(chunks: Float32Array[], srcRate: number): Blob {
    const total = chunks.reduce((n, c) => n + c.length, 0);
    if (total === 0) throw new Error('No audio samples captured.');

    // Resample to 16 kHz via box-filter + decimation.
    const targetRate = 16000;
    let raw: Float32Array;
    if (srcRate === targetRate) {
      raw = this.concatFloat32(chunks, total);
    } else {
      const concat = this.concatFloat32(chunks, total);
      const ratio = srcRate / targetRate;
      const outLen = Math.floor(concat.length / ratio);
      raw = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.min(concat.length, start + Math.ceil(ratio));
        let sum = 0;
        let count = 0;
        for (let j = start; j < end; j++) {
          sum += concat[j];
          count++;
        }
        raw[i] = count ? sum / count : 0;
      }
    }

    const buffer = new ArrayBuffer(44 + raw.length * 2);
    const view = new DataView(buffer);
    const writeStr = (offset: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + raw.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, targetRate, true);
    view.setUint32(28, targetRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, raw.length * 2, true);

    let offset = 44;
    for (let i = 0; i < raw.length; i++) {
      const s = Math.max(-1, Math.min(1, raw[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  private concatFloat32(chunks: Float32Array[], total: number): Float32Array {
    const out = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Speech-to-Text with provider cascade:
   * 1. Sarvam AI (Saaras v4) — primary
   * 2. Bhashini Indic ASR — secondary
   * 3. Browser Web Speech API — fallback
   */
  public async transcribeWithAI(
    audioBlob: Blob,
    languageCode: LanguageCode
  ): Promise<{ transcript: string; source: 'sarvam' | 'bhashini' | 'browser' }> {
    try {
      const audioBase64 = await this.blobToBase64(audioBlob);
      const bcp47 = this.getLanguageCodeBCP47(languageCode);
      const langCode = bcp47.split('-')[0];

      // 1. Sarvam Saaras v4
      const sarvamRes = await apiFetch('/api/sarvam/stt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          languageCode: langCode,
          mode: 'transcribe',
        }),
      });

      if (sarvamRes.status === 503) {
        // Sarvam not configured — fall through to Bhashini
        return this.transcribeWithBhashini(audioBase64, langCode);
      }

      if (sarvamRes.ok) {
        const data = await sarvamRes.json();
        const transcript = data.transcript || '';
        if (transcript) {
          return { transcript, source: 'sarvam' };
        }
      }

      // 2. Bhashini fallback
      return this.transcribeWithBhashini(audioBase64, langCode);
    } catch (err) {
      console.warn('[Sarvam STT] Failed, falling back to Bhashini/browser:', err);
      try {
        const audioBase64 = await this.blobToBase64(audioBlob);
        return this.transcribeWithBhashini(audioBase64, this.getLanguageCodeBCP47(languageCode).split('-')[0]);
      } catch (bhashiniErr) {
        console.warn('[Bhashini ASR] Falling back to browser STT:', bhashiniErr);
        return { transcript: '', source: 'browser' };
      }
    }
  }

  private async transcribeWithBhashini(
    audioBase64: string,
    langCode: string
  ): Promise<{ transcript: string; source: 'bhashini' | 'browser' }> {
    try {
      const res = await apiFetch('/api/asr/bhashini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          languageCode: langCode,
          sampleRate: 16000,
        }),
      });

      if (res.status === 503) {
        return { transcript: '', source: 'browser' };
      }

      if (!res.ok) throw new Error(`ASR API ${res.status}`);

      const data = await res.json();
      return { transcript: data.transcript || '', source: 'bhashini' };
    } catch (err) {
      console.warn('[Bhashini ASR] Falling back to browser STT:', err);
      return { transcript: '', source: 'browser' };
    }
  }

  /**
   * Text-to-Speech via Sarvam Bulbul v3. Decodes the returned base64 audio and
   * plays it through an <audio> element.
   *
   * Returns:
   *  - 'played'     Sarvam audio is (about to be) playing.
   *  - 'superseded' A newer speak()/stop() call happened before playback began.
   *  - 'failed'     Sarvam unavailable — callers should try browser speech.
   */
  public async speakWithSarvam(
    text: string,
    language: LanguageCode = 'en',
    onStart?: () => void,
    onEnd?: () => void,
    token?: number
  ): Promise<'played' | 'superseded' | 'failed'> {
    try {
      const res = await apiFetch('/api/sarvam/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          languageCode: language,
        }),
      });

      if (res.status === 503 || !res.ok) {
        return 'failed';
      }

      const data = await res.json();
      if (!data.audioBase64) {
        return 'failed';
      }

      // Decode base64 -> binary -> Blob -> playable object URL
      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // If a newer speak()/stop() came in while the API call was in flight,
      // never start this stale audio — it would overlap the new voice.
      if (token !== undefined && !this.isCurrent(token)) {
        URL.revokeObjectURL(audioUrl);
        return 'superseded';
      }

      const audio = new Audio(audioUrl);
      this.sarvamAudio = audio;
      audio.onplay = () => {
        if (token !== undefined && !this.isCurrent(token)) return;
        this.isSpeaking = true;
        if (onStart) onStart();
      };
      audio.onended = () => {
        this.isSpeaking = false;
        this.sarvamAudio = null;
        URL.revokeObjectURL(audioUrl);
        if (token !== undefined && !this.isCurrent(token)) return;
        if (onEnd) onEnd();
      };
      audio.onerror = () => {
        this.isSpeaking = false;
        this.sarvamAudio = null;
        URL.revokeObjectURL(audioUrl);
        if (token !== undefined && !this.isCurrent(token)) return;
        if (onEnd) onEnd();
      };

      await audio.play();
      return 'played';
    } catch (err) {
      console.warn('[Sarvam TTS] Failed, falling back to browser speech:', err);
      return 'failed';
    }
  }
}

export const speechService = new SpeechService();
