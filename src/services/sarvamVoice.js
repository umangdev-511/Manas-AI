const VOICE_ENDPOINT = '/.netlify/functions/sarvam';

async function readError(response) {
  try {
    const payload = await response.json();
    return payload.error?.message || payload.error || payload.message || 'Sarvam request failed.';
  } catch {
    return `Sarvam request failed with status ${response.status}.`;
  }
}

export async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  const isMp4 = audioBlob.type.includes('mp4');
  const extension = isMp4 ? 'm4a' : 'webm';
  const uploadMimeType = isMp4 ? 'audio/mp4' : 'audio/webm';
  const normalizedAudio = new Blob([audioBlob], { type: uploadMimeType });

  formData.append('file', normalizedAudio, `manas-voice.${extension}`);
  formData.append('model', 'saaras:v3');
  formData.append('mode', 'transcribe');

  const response = await fetch(`${VOICE_ENDPOINT}?action=stt`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error(await readError(response));

  const payload = await response.json();
  if (!payload.transcript?.trim()) throw new Error('No speech was detected. Please try again.');

  return {
    transcript: payload.transcript.trim(),
    languageCode: payload.language_code || 'en-IN',
  };
}

export async function translateReply(text, targetLanguageCode) {
  if (!targetLanguageCode || targetLanguageCode === 'en-IN') return text;

  const response = await fetch(`${VOICE_ENDPOINT}?action=translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: text,
      source_language_code: 'auto',
      target_language_code: targetLanguageCode,
      model: 'mayura:v1',
      mode: 'modern-colloquial',
      speaker_gender: 'Female',
    }),
  });

  if (!response.ok) throw new Error(await readError(response));

  const payload = await response.json();
  return payload.translated_text?.trim() || text;
}

export async function translateForSafetyAnalysis(text) {
  const response = await fetch(`${VOICE_ENDPOINT}?action=translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: text,
      source_language_code: 'auto',
      target_language_code: 'en-IN',
      model: 'mayura:v1',
      mode: 'modern-colloquial',
      speaker_gender: 'Female',
    }),
  });

  if (!response.ok) throw new Error(await readError(response));

  const payload = await response.json();
  return payload.translated_text?.trim() || text;
}

export async function generateContextualReply(context) {
  const response = await fetch(`${VOICE_ENDPOINT}?action=reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  });

  if (!response.ok) throw new Error(await readError(response));

  const payload = await response.json();
  const text = payload.choices?.[0]?.message?.content?.trim();
  const questionCount = (text?.match(/\?/g) || []).length;
  const wordCount = text?.split(/\s+/).filter(Boolean).length || 0;
  const blocked = /i understand|that must be hard|thank you for sharing|i am here to support you|stay positive|everything will be okay|calm down|just relax|set (?:it|those thoughts) aside/i;

  if (!text || wordCount > 70 || questionCount > 1 || blocked.test(text)) {
    throw new Error('Sarvam reply did not pass the Sunna response guard.');
  }

  return text;
}

function languageForText(text, fallback) {
  const scripts = [
    [/[ऀ-ॿ]/, 'hi-IN'],
    [/[ঀ-৿]/, 'bn-IN'],
    [/[਀-੿]/, 'pa-IN'],
    [/[઀-૿]/, 'gu-IN'],
    [/[଀-୿]/, 'od-IN'],
    [/[஀-௿]/, 'ta-IN'],
    [/[ఀ-౿]/, 'te-IN'],
    [/[ಀ-೿]/, 'kn-IN'],
    [/[ഀ-ൿ]/, 'ml-IN'],
  ];
  return scripts.find(([pattern]) => pattern.test(text))?.[1]
    || (fallback === 'en-IN' ? fallback : 'en-IN');
}

export async function synthesizeSpeech(text, languageCode = 'en-IN') {
  const spokenLanguage = languageForText(text, languageCode);
  const response = await fetch(`${VOICE_ENDPOINT}?action=tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      language_code: spokenLanguage,
      model: 'bulbul:v3',
      speaker: 'priya',
      pace: 0.92,
      output_audio_codec: 'wav',
    }),
  });

  if (!response.ok) throw new Error(await readError(response));

  const payload = await response.json();
  const base64Audio = payload.audios?.join('');
  if (!base64Audio) throw new Error('Sarvam returned no audio.');

  return `data:audio/wav;base64,${base64Audio}`;
}
