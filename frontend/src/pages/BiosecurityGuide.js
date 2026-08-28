import React, { useState } from 'react';
import Navbar from '../homepage/Navbar';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import './BiosecurityGuide.css';

const BiosecurityGuide = () => {
  const [isAvianFlu, setIsAvianFlu] = useState(false);

  const toggleView = () => {
    setIsAvianFlu(!isAvianFlu);
  };

  const generalTips = [
    { title: "Sanitation", description: "Disinfect all equipment and surfaces frequently and between uses to prevent the spread of disease.", color: "#4CAF50" },
    { title: "Quarantine", description: "Isolate new animals for a minimum of 14 days before introducing them to your livestock.", color: "#2196F3" },
    { title: "Visitor Access", description: "Limit farm access to essential personnel only.", color: "#FF9800" },
    { title: "Protective Clothing", description: "Use dedicated protective clothing and footwear when handling livestock to prevent cross-contamination.", color: "#9C27B0" },
    { title: "Health Monitoring", description: "Regularly monitor the health of your livestock and keep detailed health records.", color: "#F44336" }
  ];

  const avianFluTips = [
    { title: "Monitoring", description: "Check your livestock daily for symptoms.", color: "#4CAF50" },
    { title: "Wild Bird Exposure", description: "Avoid exposing livestock to wild birds to prevent the spread of disease.", color: "#2196F3" },
    { title: "Contact Authorities", description: "If you have an animal that tests positive for Avian Flu or is displaying symptoms, contact your local/state wildlife management agency per your state's reporting regulations.", color: "#FF9800" },
    { title: "Isolation", description: "Immediately isolate any livestock showing symptoms of Avian Flu.", color: "#9C27B0" },
    { title: "Sanitize Equipment", description: "Regularly sanitize equipment and surfaces that come into contact with livestock.", color: "#F44336" }
  ];

  const sources = [
    { name: "USDA Animal and Plant Health Inspection Service", url: "https://www.aphis.usda.gov/livestock-poultry-disease/avian/avian-influenza/hpai-detections/livestock/enhance-biosecurity" },
    { name: "Minnesota Board of Animal Health", url: "https://bah.state.mn.us/biosecurity" },
    { name: "Centers for Disease Control and Prevention (CDC) - Avian Influenza", url: "https://www.cdc.gov/flu/avianflu/" },
    { name: "World Organisation for Animal Health (OIE) - Avian Influenza", url: "https://www.woah.org/en/disease/avian-influenza/" }
  ];

  return (
    <div className="biosecurity-guide-page">
      {/* Header */}
      <SiteHeader />

      {/* Navbar */}
      <Navbar />

      {/* Main container that takes up available space */}
      <div className="biosecurity-guide-main-container">
        {/* Main Content */}
        <main className="biosecurity-guide-main">
          <h2 className="biosecurity-guide-title">
            {isAvianFlu ? "Avian Flu Prevention Guidelines" : "Biosecurity Guide"}
          </h2>

          <div className="toggle-buttons">
            <button
              onClick={toggleView}
              className={isAvianFlu ? 'active' : ''}
              style={{ background: isAvianFlu ? '#9C27B0' : '#4CAF50' }}
            >
              {isAvianFlu ? "General Biosecurity Guidelines" : "Avian Flu Biosecurity"}
            </button>
          </div>

          <div className="biosecurity-guide-content">
            {(isAvianFlu ? avianFluTips : generalTips).map((tip, index) => (
              <div key={index} className="tip-card" style={{ borderLeftColor: tip.color }}>
                <h3 style={{ color: tip.color }}>{tip.title}</h3>
                <p>{tip.description}</p>
              </div>
            ))}
          </div>

          {/* Footer inside the main container */}
          <div className="biosecurity-guide-footer">
            <h3>Sources</h3>
            <ul>
              {sources.map((source, index) => (
                <li key={index}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a>
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>

      {/* Site Footer */}
      <SiteFooter />
    </div>
  );
};

export default BiosecurityGuide;