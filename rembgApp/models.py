from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class User(AbstractUser):
    username = models.CharField(max_length=64, unique=True)
    password = models.CharField(max_length=64)
    email = models.EmailField(max_length=64)

    def __str__(self):
        return f" Username: {self.username} | Email: {self.email} | Password: {self.password}"

# Create your models here.
class Uploaded_Pictures(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    images_text = models.TextField(max_length=400)
    rmbg_picture = models.TextField(max_length=400, blank=True, null=True)
    createdDate = models.DateTimeField(default=timezone.now)
    background_image = models.TextField(max_length=400, blank=True, null=True)
   
    class Meta:
        verbose_name_plural = "Uploaded Pictures"

    def __str__(self):
        return f"upload_id: {self.id} | Username: {self.author.username} | Images: {self.images_text} | background Image: {self.background_image} | Created date {self.createdDate}"
    

class Metadata(models.Model):
    project = models.ForeignKey(Uploaded_Pictures, on_delete=models.CASCADE, related_name='metadata')
    canvas_width = models.IntegerField(blank=True, null=True)
    canvas_height = models.IntegerField(blank=True, null=True)
    image_path = models.TextField(blank=True, null=True)
    background_path = models.TextField(blank=True, null=True)
    shadow_offset_y = models.FloatField(blank=True, null=True)
    shadow_blur = models.FloatField(blank=True, null=True)
    shadow_color = models.CharField(max_length=50, blank=True, null=True)
    image_x = models.FloatField(blank=True, null=True)
    image_y = models.FloatField(blank=True, null=True)
    image_scale = models.FloatField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # New fields for header, footer, logo, and texts
    header_height = models.IntegerField(default=0)
    header_color = models.CharField(max_length=50, default='#000000')
    header_opacity = models.FloatField(default=1.0)

    footer_height = models.IntegerField(default=0)
    footer_color = models.CharField(max_length=50, default='#000000')
    footer_opacity = models.FloatField(default=1.0)

    logo_path = models.TextField(blank=True, null=True)
    logo_x = models.FloatField(default=100)
    logo_y = models.FloatField(default=100)
    logo_scale = models.FloatField(default=1.0)

    # JSON field to store texts (you can use Django's JSONField)
    texts = models.JSONField(default=list, blank=True, null=True)  # Stores a list of text objects
    

    def __str__(self):
        return f"entry #: {self.id} | Metadata - project id: {self.project.id} | Image Scale: {self.image_scale} | Image path: {self.image_path}"