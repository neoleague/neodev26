import inspect
import asyncio
from asgiref.sync import async_to_sync, sync_to_async
from collections import deque
from datetime import timedelta
from django.conf import settings
from django.urls import resolve, Resolver404
from django.utils import timezone
from django.core.cache import cache
from django.http import JsonResponse

from django.contrib import admin


max_queue_length = settings.THROTTLE_MAX_QUEUE_LENGTH
window_length = settings.THROTTLE_WINDOW_LENGTH

@sync_to_async
def get_user_auth_status(request):
    return hasattr(request, 'user') and request.user.is_authenticated

class ThrottleMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response
        # Mark this middleware as capable of handling both sync and async requests
        if inspect.iscoroutinefunction(self.get_response):
            asyncio.markcoroutinefunction(self)

    def __call__(self, request):
        return async_to_sync(self.manage_throttle)(request)
    
    async def __acall__(self, request):
        return await self.manage_throttle(request)
    
    async def manage_throttle(self, request):
        
        if request.path == '/favicon.ico':
            return await self._call_next(request)

        try:
            match = resolve(request.path)
            if match.namespace == admin.site.name:
                print('admin request -> skipped rate limiter')
                return await self._call_next(request)
        except Resolver404:
            pass
        
        now = timezone.now()
        window = now - timedelta(seconds=window_length)

        is_authenticated = await get_user_auth_status(request)

        if is_authenticated:
            user_key = f'throttle_queue:{request.user.id}'
        else:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            ip_address = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
            user_key = f'throttle_queue:{ip_address}'

        # Collections deque of timestamps
        throttle_queue: deque = cache.get(user_key)

        if throttle_queue:
            
            while throttle_queue and throttle_queue[0] < window:
                throttle_queue.popleft()

            if len(throttle_queue) > max_queue_length - 1:
                
                oldest_request_time = throttle_queue[0]
    
                # It expires exactly at: oldest_request_time + window_length
                expiry_time = oldest_request_time + timedelta(seconds=window_length)
                
                # The time remaining to wait is expiry_time minus right now
                wait_seconds = (expiry_time - now).total_seconds()

                if wait_seconds <= 0:
                    wait_seconds = 0.1
                wait_seconds = wait_seconds + 0.1

                return JsonResponse(
                    {
                        'detail': {
                            'message': 'You are making requests too fast. Please slow down.',
                            'wait_seconds': wait_seconds
                        }
                    }, 
                    status=429
                )
            
            throttle_queue.append(now)
        
        else:
            throttle_queue = deque([now])

        cache.set(user_key, throttle_queue, timeout=(window_length + 1))

        return await self._call_next(request)
    
    async def _call_next(self, request):
        if inspect.iscoroutinefunction(self.get_response):
            return await self.get_response(request)
        else:
            return await sync_to_async(self.get_response, thread_sensitive=True)(request)