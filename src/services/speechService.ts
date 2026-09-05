import { LanguageCode } from '../types';

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public getLanguageCodeBCP47(lang: LanguageCode): string {
    const map: { [key in LanguageCode]: string } = {
      hi: 'hi-IN',
      en: 'en-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      bn: 'bn-IN',
      mr: 'mr-IN',
      gu: 'gu-IN',
      kn: 'kn-IN',
      pa: 'pa-IN',
      ml: 'ml-IN',
      or: 'or-IN',
      as: 'as-IN',
    };
    return map[lang] || 'en-IN';
  }

  public speak(
    text: string,
    language: LanguageCode = 'en',
    onStart?: () => void,
    onEnd?: () => void
  ): boolean {
    if (!this.synth) return false;

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.getLanguageCodeBCP47(language);
    utterance.rate = 0.95; // Slightly slower for low-literacy clarity
    const targetBcp47 = this.getLanguageCodeBCP47(language);
    utterance.lang = targetBcp47;
    utterance.rate = 0.92; // Clear, deliberate cadence for clinical kiosk
    utterance.pitch = 1.0;

    // Try to find a matching natural regional voice using 3-tier matching
    const voices = this.synth.getVoices();
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
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    return true;
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
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
}

export const speechService = new SpeechService();
