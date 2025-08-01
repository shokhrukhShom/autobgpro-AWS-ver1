import stripe
from django.http import HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rembgApp.models import UserProfile
from datetime import datetime
from django.utils.timezone import make_aware
from datetime import datetime
from .models import User



@csrf_exempt
def stripe_webhook(request):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are accepted")
    
    try:
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        if not sig_header:
            return HttpResponseBadRequest("Missing Stripe signature header")
            
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.STRIPE_WEBHOOK_SECRET
        )
        
        
        
        # Handle events (same as before)
        if event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            handle_subscription_update(subscription)
            
        # Return success response for other event types
        return HttpResponse("Webhook received", status=200)
                
    except ValueError as e:
        return HttpResponseBadRequest(f"Invalid payload: {str(e)}")
    except stripe.error.SignatureVerificationError as e:
        return HttpResponseBadRequest(f"Invalid signature: {str(e)}")
    except Exception as e:
        return HttpResponse(status=400)



    


def handle_subscription_update(subscription):
    try:
        profile = UserProfile.objects.get(stripe_customer_id=subscription.customer)
        
        # Update basic subscription info
        profile.subscription_status = subscription.status
        
        # Update plan info
        price_id = subscription['items']['data'][0]['price']['id']
        if price_id == settings.STRIPE_PRICE_ID_PRO:
            profile.plan_type = 'pro'
            profile.monthly_image_limit = 1000
        else:
            profile.plan_type = 'starter'
            profile.monthly_image_limit = 500
            
        # Update billing period
        profile.current_period_start = datetime.fromtimestamp(subscription.current_period_start)
        profile.current_period_end = datetime.fromtimestamp(subscription.current_period_end)
        
        profile.save()
        print(f"Updated profile for {profile.user.username}")  # Debug log
    except UserProfile.DoesNotExist:
        print(f"No profile found for customer {subscription.customer}")
        


