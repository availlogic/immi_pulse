import { classNames } from '../../lib/utils';
import './drawer.css';

export default function LanguageTabs({ activeTab, onChange }) {
  const tabs = [
    { id: 'zh', label: 'Chinese' },
    { id: 'en', label: 'English' },
    { id: 'original', label: 'Original' }
  ];

  return (
    <div className="language-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={classNames('lang-tab', activeTab === tab.id && 'active')}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
