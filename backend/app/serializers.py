from rest_framework import serializers
from .models import Well, Layer


class LayerSerializer(serializers.ModelSerializer):
    thickness = serializers.ReadOnlyField()

    class Meta:
        model = Layer
        fields = [
            "id",
            "start_depth",
            "end_depth",
            "lithology",
            "description",
            "thickness",
        ]


class WellSerializer(serializers.ModelSerializer):
    layers = LayerSerializer(many=True, read_only=True)

    class Meta:
        model = Well
        fields = [
            "id",
            "name",
            "area",
            "structure",
            "design_depth",
            "created_at",
            "updated_at",
            "layers",
        ]
