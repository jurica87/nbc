/* NBC Baskets - DSGVO Cookie Consent Banner */
(function() {
  'use strict';

  var STORAGE_KEY = 'nbc-cookie-consent';
  var STORAGE_VALUE = 'essential'; // only essential cookies allowed

  function getConsent() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      // localStorage not available
    }
  }

  function buildBanner() {
    var banner = document.createElement('div');
    banner.id = 'nbc-cookie-banner';

    var inner = document.createElement('div');
    inner.className = 'cc-inner';

    var text = document.createElement('div');
    text.className = 'cc-text';
    text.innerHTML =
      'Diese Website verwendet ausschließlich technisch notwendige Cookies für die Grundfunktionen. ' +
      'Es werden keine Tracking-, Analyse- oder Werbe-Cookies gesetzt. ' +
      'Weitere Informationen findest du in unserer <a href="./Datenschutz.html">Datenschutzerklärung</a>.';

    var buttons = document.createElement('div');
    buttons.className = 'cc-buttons';

    var btnAccept = document.createElement('button');
    btnAccept.className = 'cc-btn cc-btn-accept';
    btnAccept.textContent = 'Verstanden';
    btnAccept.addEventListener('click', function() {
      setConsent(STORAGE_VALUE);
      banner.classList.remove('visible');
      setTimeout(function() { banner.style.display = 'none'; }, 300);
    });

    var btnDecline = document.createElement('button');
    btnDecline.className = 'cc-btn cc-btn-decline';
    btnDecline.textContent = 'Nur Notwendige';
    btnDecline.addEventListener('click', function() {
      setConsent(STORAGE_VALUE);
      banner.classList.remove('visible');
      setTimeout(function() { banner.style.display = 'none'; }, 300);
    });

    buttons.appendChild(btnAccept);
    buttons.appendChild(btnDecline);
    inner.appendChild(text);
    inner.appendChild(buttons);
    banner.appendChild(inner);
    document.body.appendChild(banner);

    // show with small delay for smooth appearance
    setTimeout(function() { banner.classList.add('visible'); }, 500);
  }

  // Only show if no consent decision stored yet
  if (!getConsent()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildBanner);
    } else {
      buildBanner();
    }
  }
})();
