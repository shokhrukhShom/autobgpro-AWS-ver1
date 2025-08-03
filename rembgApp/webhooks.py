import stripe
from django.http import HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rembgApp.models import UserProfile
from datetime import datetime
from django.utils.timezone import make_aware
from .models import User
from django.utils import timezone # Import timezone


@csrf_exempt
def stripe_webhook(request):
    print("WEBHOOK FUNCTION HIT!") # <--- ADD THIS LINE HERE
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
    print("Processing subscription update:")
    try:
        
        profile = UserProfile.objects.get(stripe_customer_id=subscription.customer)

        print(f"Subscription ID: {subscription.id}")
        print(f"Customer: {subscription.customer}")
        print(f"Status: {subscription.status}")
         
        #profile = UserProfile.objects.get(stripe_customer_id=subscription.customer)
        # Get the user profile
        
        # Get the new period dates from Stripe
        new_period_start_ts = subscription.current_period_start
        new_period_end_ts = subscription.current_period_end

        # Convert timestamps to datetime
        new_period_start = make_aware(datetime.fromtimestamp(new_period_start_ts))
        new_period_end = make_aware(datetime.fromtimestamp(new_period_end_ts))

        print(f"Current period: {new_period_start} to {new_period_end}")

        
        # Check if this is a new billing period (either first time or cycle renewal)
        if (not profile.current_period_end or 
            new_period_start > profile.current_period_end):
            # Reset the usage counter for the new period
            print("Resetting usage counter - new billing period")
            profile.images_used_this_month = 0
            print(f"Reset usage counter for {profile.user.username} - new billing period started")
        
        
        
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
        # profile.current_period_start = datetime.fromtimestamp(subscription.current_period_start)
        # profile.current_period_end = datetime.fromtimestamp(subscription.current_period_end)
        
        # Update billing period dates
        profile.current_period_start = new_period_start
        profile.current_period_end = new_period_end
    
        
        
        profile.save()
        print(f"Updated profile for {profile.user.username}")  # Debug log
    except UserProfile.DoesNotExist:
        print(f"No profile found for customer {subscription.customer}")
        


