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
        for phrase in ['30. und 31. Januar 2027', 'Gymnasiums Nordhorn', '2015 bis 2020', '80 Plätze', '69 €']:
            self.assertIn(phrase, html)
        self.assertNotRegex(html.lower(), r'fu[ßs]ball')
        tags = Tags(html).tags
        inputs = {a['name']: a for t, a in tags if t == 'input' and 'name' in a}
        for name in ['vorname', 'nachname', 'email', 'geburtstag', 'strasse', 'hausnummer',
                     'postleitzahl', 'ort', 'festnetz', 'mobilnummer', 'konfektionsgroesse',
                     'sorgeberechtigt', 'datenschutz']:
            self.assertIn(name, inputs)
            self.assertIn('required', inputs[name], name)
        self.assertEqual(inputs['geburtstag'].get('min'), '2015-01-01')
        self.assertEqual(inputs['geburtstag'].get('max'), '2020-12-31')
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
