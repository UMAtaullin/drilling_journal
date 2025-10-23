from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


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
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(30)],
        verbose_name="Проектная глубина",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "wells"
        verbose_name = "Скважина"
        verbose_name_plural = "Скважины"

    def __str__(self):
        return f"{self.name} ({self.area})"


class Layer(models.Model):
    well = models.ForeignKey(Well, on_delete=models.CASCADE, related_name="layers")
    start_depth = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Начало слоя (м)",
    )
    end_depth = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Конец слоя (м)",
    )
    lithology = models.CharField(
        max_length=20, choices=Well.LITHOLOGY_CHOICES, verbose_name="Литология"
    )
    description = models.TextField(blank=True, verbose_name="Описание")

    class Meta:
        db_table = "layers"
        verbose_name = "Слой"
        verbose_name_plural = "Слои"
        ordering = ["start_depth"]

    @property
    def thickness(self):
        """Автоматический расчет мощности слоя"""
        return self.end_depth - self.start_depth

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.end_depth <= self.start_depth:
            raise ValidationError("Конечная глубина должна быть больше начальной")

        # Проверка перекрытия слоев
        overlapping_layers = Layer.objects.filter(
            well=self.well,
            start_depth__lt=self.end_depth,
            end_depth__gt=self.start_depth,
        ).exclude(pk=self.pk)

        if overlapping_layers.exists():
            raise ValidationError("Слои не должны перекрываться")
