from django.db import DatabaseError
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

def global_django_exception_handler(exc, context):

    '''
    Stops backend and database-level error details from being sent to the frontend
    '''

    # Let DRF handle standard errors like 400 Bad Requests, 404s, etc.
    response = exception_handler(exc, context)

    if response is None:
        if isinstance(exc, DatabaseError):

            view_name = context['view'].__class__.__name__ if 'view' in context else 'Unknown View'

            logger.critical(f"DATABASE CRASH in {view_name}: {str(exc)}", exc_info=True)

            # Cuck the frontend so they cant poke or prod too hard
            return Response(
                {"detail": "The database layer is temporarily unavailable. Please try again shortly."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
    
    return response