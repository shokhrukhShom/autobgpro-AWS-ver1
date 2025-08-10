from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Uploaded_Pictures, Metadata

@receiver(post_save, sender=Uploaded_Pictures)
def sync_background_path(sender, instance, **kwargs):
    """
    Whenever Uploaded_Pictures is saved,
    update background_path in all related Metadata entries.
    """
    if instance.background_image:
        Metadata.objects.filter(project=instance).update(
            background_path=instance.background_image
        )
