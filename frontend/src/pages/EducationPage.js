import React from 'react';
import Navbar from '../homepage/Navbar';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import './EducationPage.css';

const diseaseSections = [
  {
    title: 'H5N1 (Avian Flu)',
    summary: 'H5N1 is a highly pathogenic avian influenza virus that spreads quickly among poultry and can infect wild birds, dairy cattle, and occasionally people. It is closely watched because it can cause severe losses in animal populations and disrupt food production.',
    history: 'Recent outbreaks have included large poultry depopulation events across the United States and detections in dairy herds, keeping H5N1 at the center of livestock surveillance and response planning.',
  },
  {
    title: 'Mad Cow Disease (BSE)',
    summary: 'Bovine spongiform encephalopathy is a progressive neurological disease in cattle caused by abnormal prion proteins. It is rare but historically significant because of its severe animal health impact and its link to major international trade and food safety concerns.',
    history: 'Modern BSE cases are uncommon due to feed controls and surveillance, but historical outbreaks reshaped cattle regulation and continue to influence livestock testing and import policies.',
  },
  {
    title: 'Bovine Tuberculosis',
    summary: 'Bovine tuberculosis is a chronic bacterial disease that can affect cattle and other animals, and it remains important because it can spread slowly through herds before being detected. Control depends on testing, movement restrictions, and herd management.',
    history: 'Recent outbreaks have generally been limited and handled through tracing and herd monitoring, but the disease remains a recurring concern in areas with wildlife reservoirs or interstate livestock movement.',
  },
  {
    title: 'Bluetongue',
    summary: 'Bluetongue is a viral disease affecting ruminants, especially sheep and cattle, and is spread by biting midges rather than direct animal-to-animal contact. Symptoms can include fever, swelling, and reduced productivity.',
    history: 'Outbreak patterns tend to follow seasonal vector activity, with recent history showing localized flare-ups that matter most during warm months and in regions favorable to insect transmission.',
  },
  {
    title: 'Swine Flu',
    summary: 'Swine flu refers to influenza viruses circulating in pigs that can spread within swine populations and occasionally infect humans. It matters because it can affect herd health, production efficiency, and public-health monitoring.',
    history: 'Recent outbreaks have continued to appear in swine operations and agricultural fair settings, reinforcing the need for respiratory disease surveillance, separation practices, and rapid reporting.',
  },
  {
    title: 'Other',
    summary: 'This category covers reports that do not cleanly fit the primary tracked diseases or are still being confirmed. It helps preserve awareness of unusual or emerging livestock health events while epidemiological review is underway.',
    history: 'Recent history in this category often includes suspected outbreaks, mixed-symptom herd events, and early submissions that later become classified under a more specific disease heading after investigation.',
  },
];

const EducationPage = () => {
  return (
    <div className="education-page">
      <SiteHeader />

      <Navbar />

      <main className="education-page-main">
        <section className="education-page-intro">
          <h2>Education</h2>
          <p>
            This page provides background information on the diseases tracked by the Livestock Epidemic Tracker,
            including why each disease matters and how recent outbreaks have shaped current monitoring efforts.
          </p>
        </section>

        <section className="education-page-grid">
          {diseaseSections.map((disease) => (
            <article key={disease.title} className="education-card">
              <h3>{disease.title}</h3>
              <p>
                <strong>Overview:</strong> {disease.summary}
              </p>
              <p>
                <strong>Recent History:</strong> {disease.history}
              </p>
            </article>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default EducationPage;
