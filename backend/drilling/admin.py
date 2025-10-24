from django.contrib import admin
from .models import Well, Layer


@admin.register(Well)
class WellAdmin(admin.ModelAdmin):
    list_display = ["name", "area", "structure", "design_depth"]


@admin.register(Layer)
class LayerAdmin(admin.ModelAdmin):
    list_display = ["well", "start_depth", "end_depth", "lithology"]
