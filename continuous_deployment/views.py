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

import logging
import hmac
import hashlib

from rest_framework import status
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services import redeploy


logger = logging.getLogger(__name__)


@ api_view(['POST'])
def deploy(request):
    """Check for proper authentication, then trigger an automated deployment."""

    logger.debug(f'Redeploy request recieved with data: {request.data}')

    if not (sig := request.META.get('HTTP_X_Hub_Signature_256')):
        return Response('missing signature', status=status.HTTP_400_BAD_REQUEST)

    secret = settings.GITHUB_AUTOMATED_CD_SECRET
    digest = hmac.new(secret, request.body, hashlib.sha256)  # type: ignore

    if not hmac.compare_digest(sig, digest.digest()):
        return Response('invalid signature', status=status.HTTP_400_BAD_REQUEST)

    logger.info('Redeploy request was valid. Proceeding with automatic deployment.')
    redeploy()

    return Response('ok')

