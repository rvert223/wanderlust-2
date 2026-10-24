// The Scan screen's result, laid out like an encyclopedia plate: photo with authenticity and family
// tags, name and Latin name, the visual-match box (confidence, hazard gauge, authenticity), the
// toxicity block, Muse's narration (tap to hear it), look-alikes, research sources and disclaimers.
import { DISCLAIMERS, HAZARD_LEVELS } from '../config/app';
import { CATEGORIES } from '../config/categories';
import { speak } from '../connectors/muse';
import Icon from './Icon';
import MagicButton from './MagicButton';
import PotionMeter from './PotionMeter';

export default function ScanResultCard({ photo, result, posting, onPost, onRescan }) {
  const confidence = Math.round(result.confidence * 100);
  return (
    <article className="scan-result">
      <div className="scan-photo">
        <img src={photo.dataUrl} alt="Your live capture" />
        <div className="plate-tags">
          <span className={`plate-tag ${result.authentic ? '' : 'warn'}`}>
            {result.authentic ? '✔ Live-verified capture' : '⚠ Unverified capture'}
          </span>
          {CATEGORIES[result.category] && <span className="plate-tag family">Family: {CATEGORIES[result.category].label}</span>}
        </div>
      </div>

      <div className="scan-body">
        <div className="title-row">
          <h2>{result.name}</h2>
          <span className="taxa-tag">{result.emoji} {HAZARD_LEVELS[result.hazard]}</span>
        </div>
        <p className="latin">{result.scientificName}</p>

        <div className="match-box">
          <div className="match-head">
            <Icon name="match" />
            <b>Visual match · {confidence}% confidence</b>
          </div>
          <div className="confidence" aria-label={`Confidence ${confidence}%`}>
            <span style={{ width: `${result.confidence * 100}%` }} />
            <em>{confidence}% sure</em>
          </div>
          <div className="hazard-row">
            <PotionMeter value={result.hazard} />
            <strong>{HAZARD_LEVELS[result.hazard]}</strong>
          </div>
          <p className="authenticity-note">{result.authenticityNote}</p>
        </div>

        <p>{result.summary}</p>
        {result.hazard > 0 && (
          <div className="toxicity-block">
            <Icon name="alert" />
            <div>
              <small>Toxicity hazard · {HAZARD_LEVELS[result.hazard]}</small>
              <p>{result.dangers}</p>
            </div>
          </div>
        )}

        <button className="muse-bubble" onClick={() => speak(result.narration)} title="Tap to hear the Investigator">
          {result.narration} <small>🔊 tap to listen</small>
        </button>

        {result.lookalikes.length > 0 && (
          <section className="lookalikes">
            <header>
              <h4>Beware the look-alikes</h4>
              <span className="count-pill">{result.lookalikes.length} candidate{result.lookalikes.length === 1 ? '' : 's'}</span>
            </header>
            <div className="tags">{result.lookalikes.map((name) => <span key={name}>{name}</span>)}</div>
          </section>
        )}

        <h4>From the ancient tomes</h4>
        <p className="research">{result.research.summary}</p>
        {result.research.images.length > 0 && (
          <div className="research-images">{result.research.images.map((src) => <img key={src} src={src} alt="" />)}</div>
        )}
        <ul className="sources">
          {result.research.sources.map(({ title, link }) => (
            <li key={link}><a href={link} target="_blank" rel="noreferrer">{title}</a></li>
          ))}
        </ul>

        <ul className="disclaimers">{DISCLAIMERS.map((text) => <li key={text}>{text}</li>)}</ul>

        <div className="actions">
          <MagicButton onClick={onPost} disabled={posting}>{posting ? 'Casting to the realm…' : 'Post to the Realm'}</MagicButton>
          <MagicButton variant="ghost" onClick={onRescan}>Scan another</MagicButton>
        </div>
      </div>
    </article>
  );
}
