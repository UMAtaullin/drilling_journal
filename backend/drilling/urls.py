from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"wells", views.WellViewSet)
router.register(r"layers", views.LayerViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("get-csrf/", views.WellViewSet.as_view({"get": "get_csrf"})),
]
