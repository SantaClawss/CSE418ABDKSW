import React, { useState } from 'react';
import Navbar from './homepage/Navbar';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';

const FAQPage = () => {
  const [faqs, setFaqs] = useState([
    {
      question: 'What is this platform used for?',
      answer: 'This platform is used to track and report outbreaks and provide relevant data to users. This is done by combining multiple sources like the CDC, WHO, USDA, and reports by users such as yourself', // <-- PUT YOUR ANSWER HERE
      open: false
    },
    {
      question: 'How do I report an outbreak?',
      answer: 'To report an outbreak, using the taskbar hit homepage. From there scroll down on the site until you see a button saying + Self Report. Click on this and fill in the relevant information on the right side of the page and lastly hit upload report', // <-- PUT YOUR ANSWER HERE
      open: false
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, we take data privacy seriously and implement security measures to protect your information. You can view these at out privacy policy and terms of service for direct details.', // <-- PUT YOUR ANSWER HERE
      open: false
    },
    {
      question: 'Can I view past reports?',
      answer: 'Yes, using the taskbar hit homepage. From there scroll down on the site until you see a button saying + Self Report. Click on this, on the left side you will see a blue button saying, My Reports. Click this to see the status of your reports, Approved, Rejected or pending from an admin.', // <-- PUT YOUR ANSWER HERE
      open: false
    },
    { 
      question: 'How accurate is the data',
      answer: 'We strive to provide the most up to date information possible. Admins reject or approve self reports by users in order to keep the information acurate. Along with multiple websites and organizations we pull data from.', // <-- PUT YOUR ANSWER HERE
      open: false
    },
    { 
      question: 'I need help learning how to use the app',
      answer: 'Please refer to the video below for showing how to use the app', // <-- PUT YOUR ANSWER HERE
      open: false
    }
    
  ]);


  // Default video loads automatically
  const [videoUrl, setVideoUrl] = useState('https://youtu.be/QaF37p6cuCA');

  const toggleFAQ = (index) => {
    const updated = [...faqs];
    updated[index].open = !updated[index].open;
    setFaqs(updated);
  };

  const getEmbedUrl = (url) => {
    if (!url) return '';
    const videoIdMatch = url.match(/(?:v=|youtu.be\/)([^&]+)/);
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <>
      {/* Header */}
      <SiteHeader />

      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* FAQ List */}
        <section>
          <h2>Frequently Asked Questions</h2>

          {/* TO ADD MORE QUESTIONS:
              Copy one of the objects in the faqs array above and add a new one.
              Replace the question and answer text.
          */}

          {faqs.map((faq, index) => (
            <div key={index} style={{ border: '1px solid #ccc', borderRadius: '8px', marginBottom: '0.5rem' }}>
              <div
                onClick={() => toggleFAQ(index)}
                style={{ padding: '0.75rem', cursor: 'pointer', background: '#f5f5f5', fontWeight: 'bold' }}
              >
                {faq.question}
              </div>
              {faq.open && (
                <div style={{ padding: '0.75rem' }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Video Section */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2>How to use the app?</h2>

          {/* Video is locked (no user input) */}
          <iframe
            width="100%"
            height="400"
            src={getEmbedUrl(videoUrl)}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </section>
      </main>

      {/* Footer */}
      <div style={{ marginTop: 'auto' }}>
        <SiteFooter />
      </div>
    </>
    </div>
  );
};

export default FAQPage;