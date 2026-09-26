import React from 'react';
import '../styles/LandingScreen.css';

const FEATURES = [
  { eyebrow: 'Speak naturally', title: 'Use your voice or type', copy: 'Talk in English, Hindi, Tamil, or Bengali. Manas replies in the language you choose.', icon: '◉' },
  { eyebrow: 'Find the next step', title: 'Untangle one thing at a time', copy: 'Get a calm, specific response and one small action you can take without feeling overwhelmed.', icon: '↗' },
  { eyebrow: 'Human support', title: 'A person is always one tap away', copy: 'Connect to Tele-MANAS at any point. Urgent conversations switch to a clearer safety-first view.', icon: '♥' },
];

export default function LandingScreen({ onEnterDemo, onEnterJudgeDemo }) {
  return (
    <main className="onboarding-shell">
      <nav className="onboarding-nav" aria-label="Manas">
        <div className="onboarding-logo"><span className="onboarding-logo__mark" aria-hidden="true">M</span><span>Manas</span></div>
        <a href="tel:14416" className="human-link">Talk to a person · 14416</a>
      </nav>

      <section className="onboarding-hero">
        <div className="hero-copy">
          <span className="hero-kicker">Private, voice-first emotional support</span>
          <h1>A calmer first step,<br /><em>in your language.</em></h1>
          <p>When your thoughts feel tangled, Manas helps you say what is happening, understand what needs attention, and choose one manageable next step.</p>
          <div className="hero-actions">
            <button type="button" className="primary-action" onClick={onEnterDemo}>Start a conversation <span aria-hidden="true">→</span></button>
            <button type="button" className="quiet-action" onClick={onEnterJudgeDemo}>Run the 90-second demo</button>
          </div>
          <p className="privacy-note">Prototype only · Not a diagnosis or emergency service · You can reach a human at any time</p>
        </div>

        <div className="hero-phone" aria-label="Preview of a Manas conversation">
          <div className="phone-header"><span className="phone-avatar">M</span><div><strong>Manas</strong><small>Here with you</small></div></div>
          <div className="preview-thread">
            <div className="preview-bubble preview-bubble--user">I keep opening my assignment and closing it. I feel frozen.</div>
            <div className="preview-bubble preview-bubble--manas">Three deadlines at once can make starting feel impossible. We could make the first step very small: open one file and write a single sentence. Which assignment feels least heavy?</div>
          </div>
          <div className="preview-composer"><span>●</span><em>Speak or type what’s on your mind</em><b>↑</b></div>
        </div>
      </section>

      <section className="onboarding-features" aria-label="What Manas can do">
        {FEATURES.map((feature) => (
          <article key={feature.title}>
            <span className="feature-icon" aria-hidden="true">{feature.icon}</span>
            <small>{feature.eyebrow}</small><h2>{feature.title}</h2><p>{feature.copy}</p>
          </article>
        ))}
      </section>

      <section className="onboarding-safety">
        <div><span>Need support from a person?</span><strong>Tele-MANAS is available 24×7 across India.</strong></div>
        <a href="tel:14416">Call 14416</a>
      </section>
    </main>
  );
}
