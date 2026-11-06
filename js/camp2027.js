/* Local email preparation only: no requests, analytics or registration storage. */
(function (root, factory) {
    'use strict';
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root && root.document) {
        root.NBCCamp = api;
        const doc = root.document;
        const form = doc.getElementById('camp-form');
        if (!form) return;
        const fields = doc.getElementById('camp-fields');
        const panel = doc.getElementById('mail-panel');
        const status = doc.getElementById('form-status');
        const text = doc.getElementById('mail-text');
        const open = doc.getElementById('mail-open');
        let draft = null;
        form.addEventListener('input', event => {
            if (typeof event.target.setCustomValidity === 'function') event.target.setCustomValidity('');
            if (draft) status.textContent = 'Angaben geändert. Bitte die E-Mail erneut vorbereiten.';
            draft = null;
            panel.hidden = true;
            text.value = '';
            open.href = 'mailto:info@nbc-nordhorn.de';
        });
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            try {
                draft = api.prepareRegistration(Object.fromEntries(new FormData(form)));
                text.value = draft.text;
                open.href = draft.mailto;
                panel.hidden = false;
                status.textContent = 'Die E-Mail ist vorbereitet, aber noch nicht versendet. Bitte öffnet sie im Mailprogramm oder kopiert den Text und sendet sie selbst ab.';
                status.focus();
            } catch (error) {
                draft = null;
                panel.hidden = true;
                status.textContent = error.message;
                const field = error.field === 'foto_video' ? doc.getElementById('foto-ja') : doc.getElementById(error.field);
                if (field) {
                    field.setCustomValidity(error.message);
                    field.reportValidity();
                } else status.focus();
            }
        });
        doc.getElementById('mail-copy').addEventListener('click', async () => {
            if (!draft) return;
            try {
                await root.navigator.clipboard.writeText(draft.text);
                status.textContent = 'Text kopiert. Bitte in eure E-Mail an info@nbc-nordhorn.de einfügen und dort absenden. Noch kein Versand.';
            } catch (_) {
                text.focus();
                text.select();
                status.textContent = 'Bitte den markierten Text manuell kopieren und in eure E-Mail einfügen.';
            }
        });
        doc.getElementById('mail-download').addEventListener('click', () => {
            if (!draft) return;
            const url = root.URL.createObjectURL(new Blob([draft.eml], { type: 'message/rfc822' }));
            const link = doc.createElement('a');
            link.href = url;
            link.download = 'NBC-Camp-2027-Anmeldung.eml';
            doc.body.appendChild(link);
            link.click();
            link.remove();
            root.setTimeout(() => root.URL.revokeObjectURL(url), 1500);
            status.textContent = 'E-Mail-Entwurf zum Download vorbereitet. Bitte im Mailprogramm öffnen, prüfen und selbst absenden. Noch kein Versand.';
        });
        fields.disabled = false;
    }
}(typeof window !== 'undefined' ? window : null, function () {
    'use strict';
    const recipient = 'info@nbc-nordhorn.de';
    const subject = 'Anmeldung zum 1. NBC Jugend Basketballcamp 2027';
    const clean = value => String(value || '').replace(/[\r\n\u0000]/g, ' ').trim();
    const base64 = value => {
        const bytes = new TextEncoder().encode(value);
        let binary = '';
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return btoa(binary);
    };

    function prepareRegistration(input) {
        const labels = { vorname: 'Vorname des Kindes', nachname: 'Nachname des Kindes',
            email: 'E-Mail-Adresse', geburtstag: 'Geburtstag', strasse: 'Straße', hausnummer: 'Hausnummer',
            postleitzahl: 'Postleitzahl', ort: 'Ort', festnetz: 'Festnetz', mobilnummer: 'Mobilnummer',
            konfektionsgroesse: 'Konfektionsgröße', foto_video: 'Foto-/Videoauswahl',
            sorgeberechtigt: 'Bestätigung der Sorgeberechtigung', datenschutz: 'Datenschutzhinweise' };
        const fail = (field, message) => {
            const error = new Error(message || 'Bitte ausfüllen: ' + labels[field] + '.');
            error.field = field;
            throw error;
        };
        input = input || {};
        for (const field of Object.keys(labels)) {
            if (!clean(input[field])) fail(field);
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(input.email))) fail('email', 'Bitte eine gültige E-Mail-Adresse eingeben.');
        if (!/^[0-9]{5}$/.test(clean(input.postleitzahl))) fail('postleitzahl', 'Bitte eine fünfstellige Postleitzahl eingeben.');
        if (clean(input.mobilnummer).replace(/\D/g, '').length < 5) fail('mobilnummer', 'Bitte eine erreichbare Mobilnummer eingeben.');
        const isoDate = clean(input.geburtstag);
        const parsedDate = new Date(isoDate + 'T00:00:00Z');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || Number.isNaN(parsedDate.getTime()) ||
                parsedDate.toISOString().slice(0, 10) !== isoDate || isoDate < '2010-01-01' || isoDate > '2018-12-31') {
            fail('geburtstag', 'Bitte ein gültiges Geburtsdatum aus den Jahrgängen 2010 bis 2018 eingeben.');
        }
        if (!['Ja', 'Nein'].includes(input.foto_video)) fail('foto_video', 'Bitte bei Fotos und Videos Ja oder Nein auswählen.');
        if (input.sorgeberechtigt !== 'Ja') fail('sorgeberechtigt');
        if (input.datenschutz !== 'gelesen') fail('datenschutz');
        const birthday = isoDate.split('-').reverse().join('.');
        const text = [
            'Liebe NBC Baskets,', '',
            'hiermit melde ich mein Kind zum 1. NBC Jugend Basketballcamp am 30. und 31. Januar 2027 im Gymnasium Nordhorn an.', '',
            'ANGABEN ZUM KIND UND ZUR KONTAKTPERSON',
            'Vorname des Kindes: ' + clean(input.vorname),
            'Nachname des Kindes: ' + clean(input.nachname),
            'E-Mail der Eltern / Sorgeberechtigten: ' + clean(input.email),
            'Geburtstag: ' + birthday,
            'Straße: ' + clean(input.strasse),
            'Hausnummer: ' + clean(input.hausnummer),
            'Postleitzahl: ' + clean(input.postleitzahl),
            'Ort: ' + clean(input.ort),
            'Festnetz: ' + clean(input.festnetz),
            'Mobilnummer: ' + clean(input.mobilnummer), '',
            'ANGABEN ZUM CAMP',
            'Konfektionsgröße: ' + clean(input.konfektionsgroesse),
            'Gruppenwunsch / Freund: ' + (clean(input.freund) || 'Keine Angabe'), '',
            'EINWILLIGUNGEN UND BESTÄTIGUNGEN',
            'Foto/Video: ' + clean(input.foto_video),
            'Bei Ja: freiwillige Einwilligung in Foto-/Videoaufnahmen beim Camp und deren Veröffentlichung für die Öffentlichkeitsarbeit des NBC auf der Vereinswebsite und in den offiziellen Vereinskanälen. Kein Entgeltanspruch. Widerruf für die Zukunft an info@nbc-nordhorn.de möglich.',
            'Bei Nein: keine Foto-/Videoeinwilligung; die Anmeldung ist trotzdem möglich.',
            'Ich bin sorgeberechtigt bzw. zur Anmeldung befugt: ' + clean(input.sorgeberechtigt),
            'Datenschutzhinweise zur Camp-Anmeldung: ' + clean(input.datenschutz),
            'Datenschutzhinweise: https://nbc-nordhorn.de/Camp-Datenschutz.html (Fassung 05.11.2026)', '',
            'Mir ist der Kostenbeitrag von 69 € bekannt. Die verbindliche Anmeldung ist noch keine Teilnahmebestätigung. Ich warte auf die Bestätigung des NBC und die anschließenden Zahlungsinformationen.', '',
            'Mit freundlichen Grüßen'
        ].join('\n');
        const mailto = 'mailto:' + recipient + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
        const body = base64(text).match(/.{1,76}/g).join('\r\n');
        const eml = [
            'To: ' + recipient,
            'Subject: =?UTF-8?B?' + base64(subject) + '?=',
            'X-Unsent: 1',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64', '', body
        ].join('\r\n');
        return { text, mailto, eml };
    }

    return Object.freeze({ prepareRegistration });
}));
