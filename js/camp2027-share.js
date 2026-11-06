/* Share only public camp information; never read registration fields. */
(function (root, factory) {
    'use strict';
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root && root.document) {
        root.NBCCampShare = api;
        api.mount(root.document, root.navigator);
        api.mountInstagram(root.document, root.navigator, typeof root.fetch === 'function' ? root.fetch.bind(root) : null, root.File);
    }
}(typeof window !== 'undefined' ? window : null, function () {
    'use strict';
    function getShareData() {
        return {
            title: '1. NBC Jugend Basketballcamp 2027',
            text: '1. NBC Jugend Basketballcamp am 30. und 31. Januar 2027 im Gymnasium Nordhorn. Jahrgänge 2010–2018 · Kostenbeitrag 69 €.',
            url: 'https://nbc-nordhorn.de/Camp2027.html'
        };
    }
    function mount(doc, navigator) {
        const input = doc.getElementById('camp-share-url');
        const status = doc.getElementById('camp-share-status');
        const copy = doc.getElementById('camp-share-copy');
        if (!input || !status || !copy) return;
        navigator = navigator || {};
        input.value = getShareData().url;
        const selectPublicLink = message => {
            input.value = getShareData().url;
            input.focus();
            input.select();
            status.textContent = message;
        };
        copy.hidden = false;
        copy.addEventListener('click', async () => {
            copy.disabled = true;
            try {
                await navigator.clipboard.writeText(getShareData().url);
                status.textContent = 'Link kopiert.';
            } catch (_) {
                selectPublicLink('Bitte den markierten Link manuell kopieren.');
            } finally {
                copy.disabled = false;
            }
        });
        const native = doc.getElementById('camp-share-native');
        if (native && typeof navigator.share === 'function') {
            native.hidden = false;
            native.addEventListener('click', async () => {
                native.disabled = true;
                try {
                    await navigator.share(getShareData());
                    status.textContent = 'Link an das Teilen-Menü übergeben.';
                } catch (error) {
                    if (error && error.name === 'AbortError') status.textContent = 'Teilen abgebrochen.';
                    else selectPublicLink('Teilen ist hier nicht verfügbar. Bitte den markierten Link kopieren.');
                } finally {
                    native.disabled = false;
                }
            });
        }
    }
    // Prepare the public image BEFORE the click so the share call keeps user activation.
    // File-only sharing avoids URL/text combinations that image apps may not accept.
    async function mountInstagram(doc, navigator, fetchImage, FileType) {
        if (!navigator || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function'
            || typeof fetchImage !== 'function' || typeof FileType !== 'function') return false;
        const button = doc.getElementById('camp-share-instagram');
        const status = doc.getElementById('camp-share-status');
        if (!button || !status) return false;
        let file;
        try {
            const response = await fetchImage('./images/camp2027-poster-original.jpg', {
                method: 'GET', mode: 'same-origin', credentials: 'omit', cache: 'force-cache'
            });
            if (!response.ok) return false;
            const blob = await response.blob();
            if (blob.type !== 'image/jpeg' || !blob.size) return false;
            file = new FileType([blob], 'NBC-Camp-2027-Instagram.jpg', { type: 'image/jpeg' });
            if (!navigator.canShare({ files: [file] })) return false;
        } catch (_) {
            // The static image download stays available without any sharing API or fetch.
            return false;
        }
        button.addEventListener('click', async () => {
            button.disabled = true;
            try {
                await navigator.share({ files: [file] });
                status.textContent = 'Bild an das Teilen-Menü übergeben. Dort Instagram auswählen, falls angeboten.';
            } catch (error) {
                if (error && error.name === 'AbortError') status.textContent = 'Bild-Teilen abgebrochen.';
                else status.textContent = 'Bild-Teilen ist hier nicht verfügbar. Bitte das Bild herunterladen und in Instagram auswählen.';
            } finally {
                button.disabled = false;
            }
        });
        button.disabled = false;
        button.hidden = false;
        return true;
    }
    return Object.freeze({ getShareData, mount, mountInstagram });
}));
