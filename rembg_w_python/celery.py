import os
from celery import Celery

# Set default Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rembg_w_python.settings')

# Create Celery app
app = Celery('rembg_w_python')

# Load settings from Django's settings.py with CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks.py in all apps
app.autodiscover_tasks()
