import React from 'react';

const Stats = () => {
  const statStyle = (bg, color = 'white') => ({
    padding: '1.25rem',
    color,
    fontWeight: 700,
    textAlign: 'center',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    background: bg,
  });

  return (
    <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <h4 style={{ margin: 0, color: '#1f2a44', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Recorded Outbreaks Summary
      </h4>
      <div style={statStyle('#a040ff')}>Total Outbreaks<br />9</div>
      <div style={statStyle('#0066cc')}>Total Cases<br />123</div>
      <div style={statStyle('#d32f2f')}>High Risk Areas<br />3</div>
      <div style={statStyle('#ff9100', '#000')}>Alerts<br />1</div>
    </div>
  );
};

export default Stats;