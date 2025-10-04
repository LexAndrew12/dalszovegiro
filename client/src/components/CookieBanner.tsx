import React, { useEffect, useState } from 'react';

const CookieBanner: React.FC = () => {
  const [accepted, setAccepted] = useState<boolean>(() => {
    return localStorage.getItem('cookie-consent') === 'true';
  });

  useEffect(() => {
    if (accepted) {
      localStorage.setItem('cookie-consent', 'true');
    }
  }, [accepted]);

  if (accepted) {
    return null;
  }

  return (
    <div className="cookie-banner">
      <p>
        Ez a weboldal sütiket használ. Az adatokat kizárólag a foglalások kezelésére tároljuk, további célból nem használjuk
        fel.
      </p>
      <button onClick={() => setAccepted(true)}>Elfogadom</button>
    </div>
  );
};

export default CookieBanner;
