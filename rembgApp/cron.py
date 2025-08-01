from django.utils import timezone
from .models import UserProfile

def reset_monthly_counts():
    # Run on the 1st of every month
    UserProfile.objects.filter(
        subscription_status='active'
    ).update(
        images_used_this_month=0
    )