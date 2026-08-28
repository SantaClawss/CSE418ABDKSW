import React, { useState } from 'react';

const Filters = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    disease: '',
    species: '',
    time: '',
    state: '',
  });

  const [isResetHover, setIsResetHover] = useState(false);

  const handleFilter = (type, value) => {
    const newFilters = { ...filters, [type]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const cleared = {
      disease: '',
      species: '',
      time: '',
      state: '',
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  return (
    <div
      style={{
        background: '#e8f0ff',
        padding: '1rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.25rem',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Dropdown
        label="Diseases"
        options={['Bird Flu', 'Mad Cow Disease']}
        value={filters.disease}
        onSelect={(val) => handleFilter('disease', val)}
      />

      <Dropdown
        label="Species"
        options={['Chicken', 'Pig', 'Cow']}
        value={filters.species}
        onSelect={(val) => handleFilter('species', val)}
      />

      <Dropdown
        label="Time Period"
        options={[
          'Last 30 days',
          'Last 60 days',
          'Last 90 days',
          'Last 180 days',
          'Last year',
          'All time',
        ]}
        value={filters.time}
        onSelect={(val) => handleFilter('time', val)}
      />

      <input
        type="text"
        placeholder="State (e.g. NY)"
        value={filters.state}
        onChange={(e) => handleFilter('state', e.target.value)}
        style={{
          padding: '0.5rem 1rem',
          border: '1px solid #aaa',
          borderRadius: '6px',
          width: '160px',
        }}
      />

      <button
        onClick={resetFilters}
        onMouseEnter={() => setIsResetHover(true)}
        onMouseLeave={() => setIsResetHover(false)}
        style={{
          background: isResetHover ? '#008ecc' : '#00aaff',
          color: 'white',
          border: 'none',
          fontWeight: 600,
          padding: '0.5rem 1.75rem',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: '0.2s ease',
        }}
      >
        Reset
      </button>
    </div>
  );
};

const Dropdown = ({ label, options, value, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [hoveredOption, setHoveredOption] = useState(null);

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        style={{
          padding: '0.5rem 1rem',
          minWidth: '130px',
          background: isHover ? '#f0f0f0' : 'white',
          border: '1px solid #aaa',
          borderRadius: '6px',
          cursor: 'pointer',
          textAlign: 'left',
          transition: '0.2s ease',
        }}
      >
        {value || label} ▾
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: 'white',
            minWidth: '140px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '6px',
            zIndex: 10,
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onSelect(opt);
                setIsOpen(false);
              }}
              onMouseEnter={() => setHoveredOption(opt)}
              onMouseLeave={() => setHoveredOption(null)}
              style={{
                color: 'black',
                padding: '0.65rem 1rem',
                fontSize: '0.95rem',
                cursor: 'pointer',
                background:
                  hoveredOption === opt ? '#e6e6e6' : 'white',
                transition: '0.15s ease',
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Filters;
