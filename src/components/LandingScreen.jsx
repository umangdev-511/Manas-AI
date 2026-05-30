import React, { useEffect, useMemo, useState } from 'react';
import '../styles/LandingScreen.css';

const FINAL_COUNT = 197000000;
const COUNTER_DURATION = 2000;

const AGENT_FLOW = [
  {
    name: 'Sunna',
    hindi: 'सुन्ना',
    verb: 'Listens',
  },
  {
    name: 'Samajhna',
    hindi: 'समझना',
    verb: 'Scores',
  },
  {
    name: 'Nirdeshak',
    hindi: 'निर्देशक',
    verb: 'Routes',
  },
  {
    name: 'Setu',
    hindi: 'सेतु',
    verb: 'Briefs',
  },
];

function formatNumber(value) {
  return Math.round(value).toLocaleString('en-IN');
}

export default function LandingScreen({ onEnterDemo, onEnterJudgeDemo }) {
  const [count, setCount] = useState(0);
  const [counterDone, setCounterDone] = useState(false);

  const particles = useMemo(() => (
    Array.from({ length: 12 }, (_, index) => ({
      id: `particle-${index}`,
      left: `${8 + ((index * 17) % 86)}%`,
      top: `${10 + ((index * 23) % 78)}%`,
      delay: `${index * 0.75}s`,
      duration: `${18 + (index % 5) * 4}s`,
    }))
  ), []);

  useEffect(() => {
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / COUNTER_DURATION, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setCount(FINAL_COUNT * easedProgress);

      if (progress >= 1) {
        window.clearInterval(intervalId);
        setCount(FINAL_COUNT);
        setCounterDone(true);
      }
    }, 16);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <main className="landing-screen">
      <div className="landing-grid" aria-hidden="true" />
      <div className="landing-grain" aria-hidden="true" />
      <div className="landing-particles" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.id}
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

      <section className="landing-hit" aria-label="Manas impact statement">
        <header className="landing-brand">
          <span>Manas</span>
          <i aria-hidden="true" />
        </header>

        <div className="landing-hit__center">
          <div className={`impact-number ${counterDone ? 'impact-number--complete' : ''}`}>
            {formatNumber(count)}
          </div>
          <p>Indians living with untreated mental illness</p>

          <div className={`impact-lines ${counterDone ? 'impact-lines--visible' : ''}`}>
            <strong>9,000 psychiatrists.</strong>
            <span>600 counsellors taking calls blind.</span>
            <em>Every call starts cold.</em>
          </div>

          <div className={`not-anymore ${counterDone ? 'not-anymore--visible' : ''}`}>
            <span />
            <strong>Not anymore.</strong>
          </div>
        </div>

        <a className={`scroll-hint ${counterDone ? 'scroll-hint--visible' : ''}`} href="#landing-product">
          <span>See the system</span>
          <i aria-hidden="true">↓</i>
        </a>
      </section>

      <section className="landing-product" id="landing-product" aria-label="Four agent system">
        <div className="product-card">
          <div className="product-card__intro">
            <span>Autonomous triage layer</span>
            <h1>Manas listens like a human, tracks risk like a system, and prepares the counsellor before they join.</h1>
            <p>
              Tele-MANAS proved India can build reach. Manas adds context, routing, and handoff intelligence so no counsellor starts cold.
            </p>
          </div>

          <div className="agent-flow" aria-label="Agent workflow">
            {AGENT_FLOW.map((agent, index) => (
              <React.Fragment key={agent.name}>
                <div className="agent-flow-card">
                  <strong>{agent.name}</strong>
                  <span>{agent.hindi}</span>
                  <em>{agent.verb}</em>
                </div>
                {index < AGENT_FLOW.length - 1 && (
                  <div className="flow-link" aria-hidden="true">
                    <span />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <p className="flow-line">
            Four agents. Zero human triggers. One counsellor who knows everything.
          </p>
        </div>
      </section>

      <section className="landing-cta" aria-label="Start Manas demo">
        <div>
          <span>Ready for the handoff moment</span>
          <h2>Watch a natural message become a counsellor-ready crisis case.</h2>
        </div>

        <div className="landing-actions">
          <button className="landing-button landing-button--primary" type="button" onClick={onEnterDemo}>
            Watch It Happen →
          </button>
          <button className="landing-button landing-button--secondary" type="button" onClick={onEnterJudgeDemo}>
            Judge Demo Mode
          </button>
        </div>

        <p>No login. No data stored. Session ends when you close the tab.</p>
      </section>
    </main>
  );
}
