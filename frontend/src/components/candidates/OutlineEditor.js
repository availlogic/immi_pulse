import { useState, useEffect } from 'react';
import { useAutoSave } from '../../hooks/useAutoSave';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useNewsDetail } from '../../hooks/useNewsDetail';
import './candidates.css';

export default function OutlineEditor({ candidate, onSaveNotes, onToast }) {
  const { data: detailData, isLoading } = useNewsDetail(candidate?.news_item_id);
  const [outline, setOutline] = useState(candidate?.notes || '');
  const [title, setTitle] = useState(candidate?.custom_title || candidate?.title_zh || '');
  const [isCopied, setIsCopied] = useState(false);

  const status = useAutoSave(
    JSON.stringify({ notes: outline, custom_title: title }), 
    () => onSaveNotes(candidate.news_item_id, { notes: outline, custom_title: title }), 
    1500
  );

  useEffect(() => {
    setOutline(candidate?.notes || '');
    setTitle(candidate?.custom_title || candidate?.title_zh || '');
  }, [candidate]);

  if (!candidate) return null;

  const handleCopy = () => {
    const detail = detailData?.data;
    const sources = detail ? [
      detail.metadata.source_url, 
      ...(detail.duplicates || []).map(d => d.source_url)
    ] : [];

    const markdown = `# Video Topic: ${title}

## AI Demographic Impact Analysis
${detail?.ai_analysis || 'No AI analysis available.'}

## Creator Script Outline
${outline}

## Reference Sources
${sources.map((url, i) => `- Source ${i + 1}: ${url}`).join('\n')}
`;

    navigator.clipboard.writeText(markdown).then(() => {
      setIsCopied(true);
      if (onToast) onToast('Outline Copied! Ready to paste into scripting editor.');
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="outline-editor">
      <div className="editor-header">
        <div className="title-input-wrapper">
          <label>Topic Title</label>
          <input 
            type="text" 
            className="title-input" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <button className="primary-btn copy-btn" onClick={handleCopy}>
          {isCopied ? <Check size={18} /> : <Copy size={18} />}
          {isCopied ? 'Copied!' : 'Copy Outline'}
        </button>
      </div>

      <div className="split-view">
        <div className="left-pane">
          <h3>AI Context</h3>
          {isLoading ? (
            <p>Loading AI context...</p>
          ) : (
            <div className="ai-context">
              {detailData?.data?.ai_analysis && (
                <div className="context-card">
                  <h4>Demographic Impact</h4>
                  <p>{detailData.data.ai_analysis}</p>
                </div>
              )}
              {detailData?.data?.youtube_suggestions && (
                <div className="context-card">
                  <h4>Suggested Titles</h4>
                  <ul>
                    {detailData.data.youtube_suggestions.titles.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="right-pane">
          <div className="editor-container">
            <textarea
              className="notes-textarea full-height"
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              placeholder="Flesh out your script outline here..."
            />
            <div className="editor-footer">
              <span className="char-count">{outline.length} / 4000</span>
              <div className="save-status">
                {status === 'saving' && <span className="status-text">Saving...</span>}
                {status === 'saved' && <span className="status-pill success"><Check size={14} /> Saved</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
