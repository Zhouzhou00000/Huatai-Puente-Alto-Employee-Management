import React, { useState } from 'react';

const TABS = [
  { key: 'products', label: '产品', icon: '📦' },
  { key: 'stockin', label: '入库', icon: '📥' },
  { key: 'inventory', label: '库存', icon: '🗃️' },
  { key: 'categories', label: '分类', icon: '🏷️' },
  { key: 'barcode', label: '条码打印', icon: '🔖' },
];

function ComingSoon({ label }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 20px',
      color: '#aaa',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🚧</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#555', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 14 }}>功能开发中，敬请期待</div>
    </div>
  );
}

export default function Goods({ initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'products');

  return (
    <div>
      <div className="page-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`page-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <ComingSoon label={TABS.find(t => t.key === activeTab)?.label} />
    </div>
  );
}
