"""Board-page content regression checks (standard-library unittest)."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BoardTests(unittest.TestCase):
    def test_simon_sperling_listed_as_board_member(self):
        html = (ROOT / 'Vorstand.html').read_text()
        members = re.findall(r'<h3\b[^>]*>(.*?)</h3>\s*<p\b[^>]*>(.*?)</p>', html, re.S)
        simon = [(name, role) for name, role in members if name.strip() == 'SIMON SPERLING']
        self.assertEqual(len(simon), 1, 'Simon Sperling must appear exactly once in the board list')
        self.assertEqual(simon[0][1].strip(), 'Vorstandsmitglied')
        for name in ['PATRICK OLLIGES', 'MICHAEL STIEBER', 'JENS RIEDEL']:
            self.assertIn((name, 'Geschäftsführender Vorstand'), members)


if __name__ == '__main__':
    unittest.main()
