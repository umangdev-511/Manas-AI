import React, { useEffect, useRef, useState } from 'react';
import '../styles/ConversationPanel.css';
import { synthesizeSpeech, transcribeAudio } from '../services/sarvamVoice.js';

const STARTERS = [
  'My mind will not slow down',
  'I feel stuck and overwhelmed',
  'I need help taking the next step',
];

function detectTextLanguage(text) {
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN';
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
  return 'en-IN';
}

export default function ConversationPanel({
  messages = [],
  onSendMessage,
  isLoading = false,
  errorMessage = '',
  voiceReplyRequest = null,
  onVoiceReplyHandled,
  riskLevel = 'LOW',
  onOpenInsights,
}) {
  const [draftMessage, setDraftMessage] = useState('');
  const [voiceState, setVoiceState] = useState('idle');
  const [voiceError, setVoiceError] = useState('');
  const [replyLanguage, setReplyLanguage] = useState('auto');
  const [replyAudioUrl, setReplyAudioUrl] = useState('');
  const [inputMode, setInputMode] = useState('text');
  const [helpOpen, setHelpOpen] = useState(false);
  const messageEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const urgent = riskLevel === 'HIGH' || riskLevel === 'CRITICAL';

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!voiceReplyRequest) return undefined;
    let cancelled = false;
    setVoiceState('speaking');
    setVoiceError('');
    setReplyAudioUrl('');

    synthesizeSpeech(voiceReplyRequest.text, voiceReplyRequest.languageCode)
      .then((audioUrl) => {
        if (!cancelled) {
          setReplyAudioUrl(audioUrl);
          // If the browser blocks autoplay, keep the composer usable and let
          // the visible player start speech when the user presses play.
          setVoiceState('idle');
        }
      })
      .catch((error) => { if (!cancelled) { setVoiceError(error.message); setVoiceState('idle'); } })
      .finally(() => onVoiceReplyHandled?.());

    return () => { cancelled = true; };
  }, [voiceReplyRequest, onVoiceReplyHandled]);

  const stopRecording = () => {
    window.clearTimeout(recordingTimerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  };

  const startRecording = async () => {
    if (isLoading || voiceState !== 'idle') return;
    setVoiceError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType: preferredType });
      recordedChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      recorder.addEventListener('dataavailable', (event) => { if (event.data.size) recordedChunksRef.current.push(event.data); });
      recorder.addEventListener('stop', async () => {
        stream.getTracks().forEach((track) => track.stop());
        setVoiceState('transcribing');
        try {
          const result = await transcribeAudio(new Blob(recordedChunksRef.current, { type: preferredType }));
          setVoiceState('thinking');
          await onSendMessage?.(result.transcript, { voice: true, languageCode: replyLanguage === 'auto' ? result.languageCode : replyLanguage });
        } catch (error) { setVoiceError(error.message); setVoiceState('idle'); }
      });
      recorder.start();
      setVoiceState('recording');
      recordingTimerRef.current = window.setTimeout(stopRecording, 28000);
    } catch (error) { setVoiceError(error.message || 'Microphone access failed.'); setVoiceState('idle'); }
  };

  const sendText = (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSendMessage?.(trimmed, {
      voice: true,
      languageCode: replyLanguage === 'auto' ? detectTextLanguage(trimmed) : replyLanguage,
    });
    setDraftMessage('');
  };

  const voiceCopy = {
    idle: 'Tap once, speak naturally, then tap again',
    recording: 'Listening now · tap to finish',
    transcribing: 'Turning your voice into words…',
    thinking: 'Finding a helpful next step…',
    speaking: replyAudioUrl ? 'Manas is speaking' : 'Preparing your voice reply…',
  }[voiceState];

  return (
    <section className={`conversation-panel ${urgent ? 'conversation-panel--urgent' : ''}`} aria-label="Conversation with Manas">
      <header className="conversation-header">
        <div className="conversation-identity">
          <span className="conversation-avatar">M</span>
          <div><h1>Manas</h1><p>{urgent ? 'Safety support is active' : 'A calmer first step, in your language'}</p></div>
        </div>
        <div className="conversation-actions">
          <button type="button" className="header-button" onClick={onOpenInsights}>How Manas is helping</button>
          <button type="button" className="human-button" onClick={() => setHelpOpen(true)}>Talk to a person</button>
        </div>
      </header>

      {urgent && (
        <aside className="safety-banner" role="alert">
          <div><span>Safety comes first</span><strong>You do not have to handle this moment alone.</strong><p>Stay near another person if possible and move away from anything you could use to hurt yourself.</p></div>
          <div className="safety-banner__actions"><a href="tel:14416">Call Tele-MANAS · 14416</a><a href="tel:112">Immediate danger · 112</a></div>
        </aside>
      )}

      <main className="message-area" aria-live="polite">
        {(errorMessage || voiceError) && <div className="conversation-error" role="status">{errorMessage || voiceError}</div>}

        {messages.length === 0 && (
          <section className="empty-conversation">
            <span className="empty-conversation__mark">M</span>
            <h2>What feels heaviest right now?</h2>
            <p>You can speak freely or type a few words. We will work through one thing at a time.</p>
            <div className="starter-list">
              {STARTERS.map((starter) => <button type="button" key={starter} onClick={() => sendText(starter)}>{starter}<span>→</span></button>)}
            </div>
          </section>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          const date = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
          return (
            <article className={`message-row ${isUser ? 'message-row--user' : 'message-row--manas'}`} key={message.id}>
              {!isUser && <span className="message-sender">Manas</span>}
              <div className={`message-bubble ${isUser ? 'message-bubble--user' : 'message-bubble--manas'}`}>{message.content}</div>
              {!Number.isNaN(date.getTime()) && <time>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>}
            </article>
          );
        })}

        {isLoading && <article className="message-row message-row--manas"><span className="message-sender">Manas</span><div className="message-bubble message-bubble--manas typing-bubble"><i /><i /><i /></div></article>}
        <div ref={messageEndRef} />
      </main>

      <footer className="conversation-footer">
        <div className="mode-row">
          <div className="mode-switch" aria-label="Choose how to talk">
            <button type="button" className={inputMode === 'text' ? 'active' : ''} onClick={() => setInputMode('text')}>Text</button>
            <button type="button" className={inputMode === 'voice' ? 'active' : ''} onClick={() => setInputMode('voice')}>Voice</button>
          </div>
          <label className="language-picker"><span>Reply in</span><select value={replyLanguage} onChange={(event) => setReplyLanguage(event.target.value)} disabled={voiceState !== 'idle' || isLoading}><option value="auto">My language</option><option value="en-IN">English</option><option value="hi-IN">हिन्दी</option><option value="ta-IN">தமிழ்</option><option value="bn-IN">বাংলা</option></select></label>
        </div>

        {inputMode === 'text' ? (
          <form className="message-composer" onSubmit={(event) => { event.preventDefault(); sendText(draftMessage); }}>
            <input className="message-input" value={draftMessage} onChange={(event) => setDraftMessage(event.target.value)} placeholder="Type what’s on your mind…" disabled={isLoading} aria-label="Message Manas" />
            <button className="send-button" type="submit" disabled={isLoading || !draftMessage.trim()} aria-label="Send message">↑</button>
          </form>
        ) : (
          <div className="voice-composer">
            <button className={`voice-orb voice-orb--${voiceState}`} type="button" onClick={voiceState === 'recording' ? stopRecording : startRecording} disabled={isLoading || !['idle', 'recording'].includes(voiceState)} aria-label={voiceState === 'recording' ? 'Stop recording' : 'Start voice message'}>{voiceState === 'recording' ? '■' : '●'}</button>
            <div><strong>{voiceState === 'recording' ? 'I’m listening' : 'Talk to Manas'}</strong><span>{voiceCopy}</span></div>
          </div>
        )}

        {replyAudioUrl && <audio className="voice-player" src={replyAudioUrl} autoPlay controls aria-label="Manas voice reply" onPlay={() => setVoiceState('speaking')} onEnded={() => setVoiceState('idle')} onError={() => { setVoiceError('The voice reply could not play. You can still read the response above.'); setVoiceState('idle'); }} />}
        <div className="human-footer">Prefer a real person? <button type="button" onClick={() => setHelpOpen(true)}>See human support options</button></div>
      </footer>

      {helpOpen && (
        <div className="help-overlay" role="dialog" aria-modal="true" aria-label="Human support options" onClick={() => setHelpOpen(false)}>
          <section className="help-sheet" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="help-close" onClick={() => setHelpOpen(false)} aria-label="Close">×</button>
            <span className="help-kicker">Human support</span><h2>Talking to a person can help.</h2>
            <p>You do not need the perfect words. You can simply say, “I’m having a difficult moment and I need someone to stay with me.”</p>
            <a className="help-option help-option--primary" href="tel:14416"><div><strong>Tele-MANAS</strong><span>Free 24×7 mental-health support across India</span></div><b>Call 14416</b></a>
            <a className="help-option" href="tel:112"><div><strong>Emergency support</strong><span>If you may act now or cannot stay safe</span></div><b>Call 112</b></a>
            <button type="button" className="help-return" onClick={() => setHelpOpen(false)}>Return to conversation</button>
          </section>
        </div>
      )}
    </section>
  );
}
