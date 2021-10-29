# Copyright (C) 2021 John DeVries

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.

# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

import hmac
import hashlib
from unittest.mock import MagicMock, patch
import json

from django.test import TestCase
from django.test.client import RequestFactory
from django.test.utils import override_settings

from .views import deploy


@override_settings(GITHUB_AUTOMATED_CD_SECRET=b"foo")
@patch("continuous_deployment.views.autodeploy")
class TestDeployView(TestCase):

    EXAMPLES = ({"foo": 1, "bar": 34}, {"do": "the", "thing": 4.25})

    def setUp(self):
        self.factory = RequestFactory()

    def create_request(self, data: dict, signature):
        return self.factory.post(
            "/ci_cd/do_deploy/",
            data,
            content_type="application/json",
            HTTP_X_HUB_SIGNATURE_256=signature,
        )

    def create_valid_signature(self, data):
        dummy = self.create_request(data, b"foo signature")
        signature = hmac.new(b"foo", dummy.body, hashlib.sha256)  # type: ignore
        return f"sha256={signature.hexdigest()}"

    def create_valid_request(self, data):
        sig = self.create_valid_signature(data)
        return self.create_request(data, sig)

    def test_400_on_missing_header(self, _):
        request = self.factory.post("/ci_cd/do_deploy/", {"hi": "there"})
        response = deploy(request)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data, "missing signature")

    def test_400_on_invalid_header(self, _):
        request = self.create_request({"foo": "bar"}, "hash=foo")
        # there is an assertion error if the hash type is not correct
        with self.assertRaises(AssertionError):
            response = deploy(request)
            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.data, "invalid signature")

        request = self.create_request({"foo": "bar"}, "sha256=foo")
        response = deploy(request)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data, "invalid signature")

    def test_200_on_valid_header(self, _):
        for data in self.EXAMPLES:
            request = self.create_valid_request(data)
            response = deploy(request)
            self.assertTrue(response.status_code, 200)
            self.assertTrue(response.data, "ok")

    def test_deploy_service_called_on_success(self, mock_redeploy):
        for data in self.EXAMPLES:
            request = self.create_valid_request(data)
            deploy(request)
            mock_redeploy.assert_called()

    @patch("continuous_deployment.views.hmac")
    def test_digest_of_request_body_is_used(self, mock, _):
        for data in self.EXAMPLES:
            request = self.create_valid_request(data)
            deploy(request)
            init_call = mock.new.mock_calls[0]
            self.assertEqual(init_call.args[1], bytes(json.dumps(data), "utf8"))
            mock.reset_mock()

    @patch("continuous_deployment.views.hmac")
    def test_safe_digest_comparison_used(self, mock, _):
        """The digest is valid, but we mock the proper comparison method to
        return False. Therefore, if a different not-secure comparison is used
        by accident, the view should work and this test will then fail."""

        # force the safe comparison function to return false
        mock.compare_digest.return_value = False

        # force the digest to be b'signature', thereby making an unsafe
        # equality comparison evaluate to True
        mock_digest = MagicMock()
        mock.new.return_value = mock_digest
        mock_digest.digest.return_value = "signature"

        # see what happens: if we are using the safe hmac comparison, the
        # requests will fail because of the way the mocks were set up
        for data in self.EXAMPLES:
            request = self.create_request(data, "sha256=signature")
            response = deploy(request)
            self.assertEqual(response.status_code, 400)
