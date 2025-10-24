from .models import Well, Layer
from .serializers import WellSerializer, LayerSerializer
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator


@method_decorator(ensure_csrf_cookie, name="dispatch")
class WellViewSet(viewsets.ModelViewSet):
    queryset = Well.objects.all()
    serializer_class = WellSerializer

    @action(detail=False, methods=["get"])
    def get_csrf(self, request):
        return Response({"message": "CSRF cookie set"})


@method_decorator(ensure_csrf_cookie, name="dispatch")
class LayerViewSet(viewsets.ModelViewSet):
    queryset = Layer.objects.all()
    serializer_class = LayerSerializer
