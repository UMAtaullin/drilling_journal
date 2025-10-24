from django.db import models


class Well(models.Model):
    LITHOLOGY_CHOICES = [
        ("PRS", "ПРС"),
        ("PEAT", "Торф"),
        ("LOAM", "Суглинок"),
        ("SANDY_LOAM", "Супесь"),
        ("SAND", "Песок"),
    ]

    name = models.CharField(max_length=255, verbose_name="Название скважины")
    area = models.CharField(max_length=255, verbose_name="Участок")
    structure = models.CharField(max_length=255, verbose_name="Сооружение")
    design_depth = models.DecimalField(
        max_digits=5, decimal_places=2, verbose_name="Проектная глубина"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "wells"

    def __str__(self):
        return f"{self.name} ({self.area})"


class Layer(models.Model):
    well = models.ForeignKey(Well, on_delete=models.CASCADE, related_name="layers")
    start_depth = models.DecimalField(
        max_digits=5, decimal_places=2, verbose_name="Начало слоя"
    )
    end_depth = models.DecimalField(
        max_digits=5, decimal_places=2, verbose_name="Конец слоя"
    )
    lithology = models.CharField(
        max_length=20, choices=Well.LITHOLOGY_CHOICES, verbose_name="Литология"
    )
    description = models.TextField(blank=True, verbose_name="Описание")

    class Meta:
        db_table = "layers"
        ordering = ["start_depth"]

    @property
    def thickness(self):
        return float(self.end_depth) - float(self.start_depth)
