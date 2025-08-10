from django.contrib import admin

# Register your models here.
from .models import User, Uploaded_Pictures, Metadata, Template, UserProfile


admin.site.register(User)
admin.site.register(Uploaded_Pictures)
admin.site.register(Metadata)
admin.site.register(Template)
admin.site.register(UserProfile)
