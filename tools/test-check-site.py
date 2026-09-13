"""External publication checks fail closed on inaccessible anonymous links."""
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError
spec = importlib.util.spec_from_file_location('site_check', Path(__file__).with_name('check-site.py'))
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)

class ExternalLinks(unittest.TestCase):
    def test_success_uses_no_authorization(self):
        with patch.object(site, 'build_opener') as factory:
            response = factory.return_value.open.return_value.__enter__.return_value
            response.status, response.url = 200, 'https://example.com/evidence'
            self.assertIsNone(site.check_external(response.url))
            request = factory.return_value.open.call_args.args[0]
            self.assertNotIn('Authorization', dict(request.header_items()))
            self.assertNotIn('Cookie', dict(request.header_items()))

    def test_http_and_transport_errors_block(self):
        for error in [HTTPError('https://example.com',404,'Not Found',{},None), URLError('timeout')]:
            with self.subTest(error=error), patch.object(site, 'build_opener') as factory:
                factory.return_value.open.side_effect = error
                self.assertIsNotNone(site.check_external('https://example.com'))

    def test_private_redirect_blocks(self):
        with patch.object(site, 'build_opener') as factory:
            response = factory.return_value.open.return_value.__enter__.return_value
            response.status = 200
            response.url = 'https://github.com/ge-onu/infra-aiops-career-hub'
            self.assertIn('private', site.check_external('https://example.com'))

if __name__ == '__main__':
    unittest.main()
