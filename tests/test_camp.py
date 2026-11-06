"""Camp-page acceptance checks. No real registrations or emails are sent."""
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class Tags(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class CampTests(unittest.TestCase):
    def test_camp_uses_light_professional_theme_with_local_fonts(self):
        css = (ROOT / 'css/camp2027.css').read_text()
        self.assertRegex(css, r'--background:\s*#fbf9fd')
        self.assertRegex(css, r"font-family:\s*'Oswald'")
        self.assertRegex(css, r"font-family:\s*'Inter'")
        self.assertIn('color-scheme: light', css)
        self.assertNotIn('color-scheme: dark', css)
        self.assertRegex(css, r'--surface:\s*#fff(?:fff)?;')
        self.assertIn('#F2722C', css)
        self.assertIn('#7457A3', css)
        self.assertIn('prefers-reduced-motion', css)
        self.assertNotIn('fonts.googleapis.com', css)
        self.assertNotIn('fonts.gstatic.com', css)
        for name in ['oswald-latin.woff2', 'inter-latin.woff2']:
            self.assertIn('../fonts/' + name, css)
            self.assertTrue((ROOT / 'fonts' / name).is_file())
        for name in ['Oswald-OFL.txt', 'Inter-OFL.txt']:
            self.assertIn('SIL OPEN FONT LICENSE', (ROOT / 'fonts' / name).read_text())

    def test_camp_overview_has_clear_heading_and_orange_purple_frame(self):
        html = (ROOT / 'Camp2027.html').read_text()
        css = (ROOT / 'css/camp2027.css').read_text()
        tags = Tags(html).tags
        self.assertIn('Das Camp auf einen Blick', html)
        self.assertTrue(any(t == 'h2' and a.get('id') == 'camp-overview-title' for t, a in tags))
        self.assertTrue(any(t == 'aside' and a.get('aria-labelledby') == 'camp-overview-title' for t, a in tags))
        frame_match = re.search(r'\.camp-ticket\s*\{([^}]+)\}', css)
        assert frame_match is not None, 'Camp overview frame styles missing'
        frame = frame_match.group(1)
        self.assertRegex(frame, r'border:\s*2px solid var\(--purple\)')
        self.assertIn('box-shadow:', frame)
        self.assertIn('var(--orange)', frame)
        banner_match = re.search(r'\.ticket-banner\s*\{([^}]+)\}', css)
        assert banner_match is not None, 'Camp overview heading styles missing'
        banner = banner_match.group(1)
        self.assertIn('background: var(--deep-purple)', banner)
        self.assertIn('color: #fff', banner)

    def test_supplied_team_photo_is_prominent_and_credited(self):
        html = (ROOT / 'Camp2027.html').read_text()
        tags = Tags(html).tags
        photos = [a for t, a in tags if t == 'img' and 'camp-team-photo' in a.get('class', '').split()]
        self.assertEqual(len(photos), 1, 'Supplied team photo must be visible in the hero')
        photo = photos[0]
        self.assertTrue(photo.get('alt'))
        self.assertEqual(photo.get('fetchpriority'), 'high')
        self.assertNotEqual(photo.get('loading'), 'lazy')
        self.assertEqual((photo.get('width'), photo.get('height')), ('1600', '1000'))
        self.assertIn('800w', photo.get('srcset', ''))
        self.assertIn('1600w', photo.get('srcset', ''))
        self.assertIn('sizes', photo)
        self.assertLess(html.index('class="camp-team-photo"'), html.index('class="intro wrap"'))
        for name in ['camp2027-team-800.webp', 'camp2027-team-1600.webp', 'camp2027-team-original.jpg']:
            self.assertIn('./images/' + name, html)
            self.assertTrue((ROOT / 'images' / name).is_file())
        self.assertIn('<figcaption>', html)
        self.assertIn('© philippheils.jpg', html)
        self.assertIn('Bild vollständig ansehen', html)

    def test_supplied_poster_is_secondary_and_preserves_registration_cohorts(self):
        html = (ROOT / 'Camp2027.html').read_text()
        tags = Tags(html).tags
        posters = [a for t, a in tags if t == 'img' and 'camp-poster-image' in a.get('class', '').split()]
        self.assertEqual(len(posters), 1, 'Supplied poster should appear once, outside the hero')
        poster = posters[0]
        self.assertEqual(poster.get('loading'), 'lazy')
        self.assertTrue(poster.get('alt'))
        self.assertEqual((poster.get('width'), poster.get('height')), ('720', '900'))
        self.assertIn('360w', poster.get('srcset', ''))
        self.assertIn('720w', poster.get('srcset', ''))
        self.assertLess(html.index('class="intro wrap"'), html.index('class="camp-poster-image"'))
        self.assertLess(html.index('class="camp-poster-image"'), html.index('id="anmeldung"'))
        self.assertIn('Plakat vergrößern', html)
        self.assertIn('Für die Anmeldung gelten die Jahrgänge 2010–2018.', html)
        for name in ['camp2027-poster-360.webp', 'camp2027-poster-720.webp', 'camp2027-poster-original.jpg']:
            self.assertIn('./images/' + name, html)
            self.assertTrue((ROOT / 'images' / name).is_file())
        original_links = [a for t, a in tags if t == 'a' and a.get('href') == './images/camp2027-poster-original.jpg']
        self.assertGreaterEqual(len(original_links), 1)
        self.assertTrue(all(a.get('target') == '_blank' and 'noopener' in a.get('rel', '') for a in original_links))

    def test_qr_downloads_and_share_links_use_only_the_public_camp_url(self):
        from urllib.parse import urlparse, parse_qs
        html = (ROOT / 'Camp2027.html').read_text()
        tags = Tags(html).tags
        canonical = 'https://nbc-nordhorn.de/Camp2027.html'
        self.assertTrue(any(t == 'section' and a.get('id') == 'camp-teilen' for t, a in tags))
        self.assertTrue(any(t == 'a' and a.get('href') == '#camp-teilen' for t, a in tags))
        for extension in ['png', 'svg']:
            path = './downloads/NBC-Camp-2027-QR.' + extension
            self.assertTrue((ROOT / path).is_file())
            self.assertTrue(any(t == 'a' and a.get('href') == path and 'download' in a for t, a in tags))
        self.assertTrue(any(t == 'img' and a.get('src') == './downloads/NBC-Camp-2027-QR.svg'
                            and a.get('alt') and a.get('width') and a.get('height') for t, a in tags))
        links = {a['id']: a for t, a in tags if t == 'a' and a.get('id', '').startswith('camp-share-')}
        whatsapp = urlparse(links['camp-share-whatsapp']['href'])
        self.assertEqual((whatsapp.scheme, whatsapp.netloc), ('https', 'wa.me'))
        self.assertIn(canonical, parse_qs(whatsapp.query)['text'][0])
        facebook = urlparse(links['camp-share-facebook']['href'])
        self.assertEqual((facebook.scheme, facebook.netloc), ('https', 'www.facebook.com'))
        self.assertEqual(parse_qs(facebook.query)['u'], [canonical])
        email = urlparse(links['camp-share-email']['href'])
        self.assertEqual(email.scheme, 'mailto')
        self.assertIn(canonical, parse_qs(email.query)['body'][0])
        for name in ['camp-share-whatsapp', 'camp-share-facebook']:
            self.assertEqual(links[name].get('target'), '_blank')
            self.assertIn('noopener', links[name].get('rel', ''))
            self.assertEqual(links[name].get('referrerpolicy'), 'no-referrer')
        for name in ['camp-share-copy', 'camp-share-native']:
            button = next(a for t, a in tags if t == 'button' and a.get('id') == name)
            self.assertEqual(button.get('type'), 'button')
            self.assertIn('hidden', button)
        public_link = next(a for t, a in tags if t == 'input' and a.get('id') == 'camp-share-url')
        self.assertEqual(public_link.get('value'), canonical)
        self.assertIn('readonly', public_link)
        self.assertIn('role="status"', html)
        self.assertIn('./js/camp2027-share.js', html)

    def test_social_buttons_reuse_news_icons_and_shared_pill_styling(self):
        html = (ROOT / 'Camp2027.html').read_text()
        reference = (ROOT / 'news/sparkasse-spendenuebergabe-2026.html').read_text()
        reference_paths = {a['d'] for t, a in Tags(reference).tags if t == 'path' and 'd' in a}
        for identifier in ['camp-share-whatsapp', 'camp-share-facebook', 'camp-share-copy', 'camp-share-email', 'camp-share-native']:
            match = re.search(r'<(?:a|button)\b[^>]*id="' + identifier + r'"[^>]*>(.*?)</(?:a|button)>', html, re.S)
            assert match is not None, identifier
            inner_tags = Tags(match.group(1)).tags
            icons = [a for t, a in inner_tags if t == 'svg']
            self.assertEqual(len(icons), 1, identifier + ' needs an inline icon')
            self.assertEqual(icons[0].get('viewbox'), '0 0 24 24')
            self.assertEqual(icons[0].get('aria-hidden'), 'true')
            self.assertEqual(icons[0].get('focusable'), 'false')
            if identifier in ['camp-share-whatsapp', 'camp-share-facebook', 'camp-share-copy']:
                self.assertTrue(any(t == 'path' and a.get('d') in reference_paths for t, a in inner_tags), identifier)
        self.assertIn('Instagram / Link', html)
        self.assertIn('id="camp-instagram-help"', html)
        self.assertIn('aria-describedby="camp-instagram-help"', html)
        self.assertIn('./css/social-share.css', html)
        common_css = ROOT / 'css/social-share.css'
        self.assertTrue(common_css.is_file())
        self.assertIn('border-radius: 999px', common_css.read_text())
        self.assertNotIn('font-awesome', html.lower())

    def test_camp_privacy_and_homepage_discovery_are_present(self):
        privacy = ROOT / 'Camp-Datenschutz.html'
        self.assertTrue(privacy.is_file(), 'Dedicated camp privacy notice is missing')
        policy = privacy.read_text()
        for phrase in ['Verantwortlich', 'info@nbc-nordhorn.de', 'E-Mail', 'Speicherdauer',
                       'Foto', 'Widerruf', 'Rechte', 'Beschwerde', 'GitHub']:
            self.assertIn(phrase, policy)
        self.assertIn('CELEX:32016R0679', policy)
        self.assertNotIn('[Name', policy)
        self.assertIn('./Camp2027.html', (ROOT / 'index.html').read_text())
        tree = ET.parse(ROOT / 'sitemap.xml')
        urls = [loc.text for loc in tree.findall('.//{*}loc')]
        self.assertIn('https://nbc-nordhorn.de/Camp2027.html', urls)
        self.assertEqual(len(urls), len(set(urls)))

    def test_camp_form_is_complete_and_honest_about_email_delivery(self):
        page = ROOT / 'Camp2027.html'
        self.assertTrue(page.is_file(), 'Camp registration page is missing')
        html = page.read_text()
        self.assertIn('Anmeldung zum 1. NBC Jugend Basketballcamp 2027', html)
        for phrase in ['30. und 31. Januar 2027', 'Gymnasiums Nordhorn', '2010 bis 2018', '80 Plätze', '69 €']:
            self.assertIn(phrase, html)
        self.assertNotRegex(html.lower(), r'fu[ßs]ball')
        tags = Tags(html).tags
        inputs = {a['name']: a for t, a in tags if t == 'input' and 'name' in a}
        for name in ['vorname', 'nachname', 'email', 'geburtstag', 'strasse', 'hausnummer',
                     'postleitzahl', 'ort', 'festnetz', 'mobilnummer', 'konfektionsgroesse',
                     'sorgeberechtigt', 'datenschutz']:
            self.assertIn(name, inputs)
            self.assertIn('required', inputs[name], name)
        self.assertEqual(inputs['geburtstag'].get('min'), '2010-01-01')
        self.assertEqual(inputs['geburtstag'].get('max'), '2018-12-31')
        for name in ['krankheiten', 'allergien', 'essensvorschriften']:
            self.assertNotIn(name, inputs)
        self.assertIn('freund', inputs)
        self.assertNotIn('required', inputs['freund'])
        photo = [a for t, a in tags if t == 'input' and a.get('name') == 'foto_video']
        self.assertEqual({a['value'] for a in photo}, {'Ja', 'Nein'})
        self.assertTrue(all('checked' not in a for a in photo))
        labels = {a.get('for') for t, a in tags if t == 'label'}
        for t, a in tags:
            if t == 'input' and a.get('type') not in ['hidden', 'submit']:
                self.assertIn(a.get('id'), labels)
        self.assertIn('Mailprogramm', html)
        self.assertIn('auf „Senden“', html)
        self.assertIn('noch keine Teilnahmebestätigung', html)
        self.assertNotIn('api.web3forms.com', html)
        self.assertIn('mailto:info@nbc-nordhorn.de', html)
        self.assertIn('./Camp-Datenschutz.html', html)
        self.assertIn('./js/camp2027.js', html)
        self.assertIn('./css/camp2027.css', html)
        self.assertNotIn('fonts.googleapis.com', html)
        self.assertNotIn('cdn.tailwindcss.com', html)


if __name__ == '__main__':
    unittest.main()
