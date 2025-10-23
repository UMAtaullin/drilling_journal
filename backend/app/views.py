from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Well, Layer
from .serializers import WellSerializer, LayerSerializer


class WellViewSet(viewsets.ModelViewSet):
    queryset = Well.objects.all().prefetch_related("layers")
    serializer_class = WellSerializer

    @action(detail=True, methods=["post"])
    def add_layer(self, request, pk=None):
        well = self.get_object()
        serializer = LayerSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(well=well)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LayerViewSet(viewsets.ModelViewSet):
    queryset = Layer.objects.all()
    serializer_class = LayerSerializer
