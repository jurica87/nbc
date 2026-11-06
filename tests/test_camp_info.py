"""Acceptance checks for the approved camp information box."""
from pathlib import Path
import re
import unittest
from html import unescape

ROOT = Path(__file__).resolve().parents[1]


class CampInfoTests(unittest.TestCase):
    def test_information_box_after_intro_before_registration(self):
        html = (ROOT / 'Camp2027.html').read_text()
        match = re.search(r'<section\b[^>]*id="camp-infos"[^>]*>(.*?)</section>', html, re.S)
        assert match is not None, 'Additional camp information section is missing'
        intro_end = html.index('</section>', html.index('id="willkommen-title"'))
        self.assertGreater(match.start(), intro_end)
        self.assertLess(match.end(), html.index('id="anmeldung"'))
        self.assertIn('aria-labelledby="camp-infos-title"', match.group())
        text = unescape(re.sub(r'<[^>]*>', ' ', match.group()))
        text = ' '.join(text.split())
        for requirement in ['Samstag, 30. Januar', '09:00–17:00 Uhr',
                            'Sonntag, 31. Januar', '09:00–16:00 Uhr',
                            'gemeinsame Lunchpause', 'Obst und Getränken',
                            'kleine Trainingseinheiten', 'Anfänger', 'Fortgeschrittene',
                            'Spielabzeichens Basketball', 'Bronze, Silber und Gold',
                            'Turniere', 'Wettbewerbe', 'Campshirt',
                            'Kuchen', 'am Sonntag gegen eine Spende', 'Verein']:
            with self.subTest(requirement=requirement):
                self.assertIn(requirement, text)
        self.assertNotIn('<input', match.group())
        self.assertNotIn('<form', match.group())


if __name__ == '__main__':
    unittest.main()
