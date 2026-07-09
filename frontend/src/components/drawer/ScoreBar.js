import { getScoreColorClass } from '../../lib/utils';
import './drawer.css';

export default function ScoreBar({ label, score }) {
  const colorClass = getScoreColorClass(score);
  
  return (
    <div className="score-bar-wrapper">
      <div className="score-bar-header">
        <span className="score-label">{label}</span>
        <span className={`score-value ${colorClass}`}>{score}</span>
      </div>
      <div className="score-track">
        <div 
          className={`score-fill ${colorClass}`} 
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
