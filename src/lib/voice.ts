import type { AssistantSettings } from '../types'

/** Strip markdown for speech synthesis */
export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim()
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function isListeningSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return []
  return window.speechSynthesis.getVoices()
}

export function speakText(
  text: string,
  settings: Pick<AssistantSettings, 'voiceURI' | 'voiceRate' | 'voicePitch'>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isSpeechSupported()) {
      reject(new Error('Speech synthesis not supported'))
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(text))
    utterance.rate = settings.voiceRate
    utterance.pitch = settings.voicePitch

    if (settings.voiceURI) {
      const voice = getAvailableVoices().find((v) => v.voiceURI === settings.voiceURI)
      if (voice) utterance.voice = voice
    }

    utterance.onend = () => resolve()
    utterance.onerror = () => reject(new Error('Speech synthesis failed'))
    window.speechSynthesis.speak(utterance)
  })
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}

type SpeechRecognitionCtor = new () => {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function listenOnce(): Promise<string> {
  return new Promise((resolve, reject) => {
    const Recognition = getSpeechRecognition()
    if (!Recognition) {
      reject(new Error('Speech recognition not supported'))
      return
    }

    const recognition = new Recognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim()
      if (transcript) resolve(transcript)
      else reject(new Error('No speech detected'))
    }
    recognition.onerror = (event) => reject(new Error(event.error))
    recognition.onend = () => {}
    recognition.start()
  })
}
