import stripe
from django.http import HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rembgApp.models import UserProfile
from datetime import datetime
from django.utils.timezone import make_aware
from .models import User
from django.utils import timezone # Import timezone


# 3rd versiion 
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
        elif event['type'] == 'customer.subscription.deleted': # New: Handle subscription deletion
            subscription = event['data']['object']
            handle_subscription_deleted(subscription)
            
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
        profile = UserProfile.objects.get(stripe_customer_id=subscription['customer'])

        print(f"Subscription ID: {subscription.get('id', 'N/A')}")
        print(f"Customer: {subscription.get('customer', 'N/A')}")
        print(f"Status: {subscription.get('status', 'N/A')}")
        
        # --- Start Debugging Block ---
        # print("\n--- Full Stripe Subscription Object (for debugging) ---")
        # import json
        # print(json.dumps(subscription, indent=2))
        # print("----------------------------------------------------\n")
        # --- End Debugging Block ---

        # Safely get period dates from the subscription item
        # These are nested within the 'items' data array
        subscription_item_data = subscription['items']['data'][0] if subscription['items']['data'] else {}
        new_period_start_ts = subscription_item_data.get('current_period_start')
        new_period_end_ts = subscription_item_data.get('current_period_end')

        if new_period_start_ts is None or new_period_end_ts is None:
            print("Warning: 'current_period_start' or 'current_period_end' missing from Stripe payload's subscription item. Skipping date updates.")
            # If these are missing, we might not want to reset usage or update dates
            # For now, we'll use existing profile dates or default to now if they don't exist
            new_period_start = profile.current_period_start if profile.current_period_start else timezone.now()
            new_period_end = profile.current_period_end if profile.current_period_end else timezone.now() + timezone.timedelta(days=30)
        else:
            new_period_start = make_aware(datetime.fromtimestamp(new_period_start_ts))
            new_period_end = make_aware(datetime.fromtimestamp(new_period_end_ts))

        print(f"Stripe's new period: {new_period_start} to {new_period_end}")
        print(f"Profile's current_period_end BEFORE update: {profile.current_period_end}")

        
        # Check if this is a new billing period (either first time or cycle renewal)
        if (not profile.current_period_end or new_period_start > profile.current_period_end):
            print("Condition met: Resetting usage counter - new billing period")
            profile.images_used_this_month = 0
            print(f"Reset usage counter for {profile.user.username} - new billing period started")
        else:
            print("Condition NOT met: Usage counter NOT reset. new_period_start <= profile.current_period_end")
            print(f"  new_period_start: {new_period_start}")
            print(f"  profile.current_period_end: {profile.current_period_end}")

        
        profile.subscription_status = subscription.get('status', profile.subscription_status) # Safely get status
        
        # Update plan info
        # The price_id is correctly accessed from the subscription item
        price_id = subscription['items']['data'][0]['price']['id']
        
        if price_id == settings.STRIPE_PRICE_ID_STARTER:
            profile.plan_type = 'starter'
            profile.monthly_image_limit = 500
        elif price_id == settings.STRIPE_PRICE_ID_PRO:
            profile.plan_type = 'pro'
            profile.monthly_image_limit = 1000
        elif price_id == settings.STRIPE_PRICE_ID_EXPERT:
            profile.plan_type = 'expert'
            profile.monthly_image_limit = 2000
        elif price_id == settings.STRIPE_PRICE_ID_STARTER_YEARLY:
            profile.plan_type = 'starter-yearly'
            profile.monthly_image_limit = 500
        elif price_id == settings.STRIPE_PRICE_ID_PRO_YEARLY:
            profile.plan_type = 'pro-yearly'
            profile.monthly_image_limit = 1000
        elif price_id == settings.STRIPE_PRICE_ID_EXPERT_YEARLY:
            profile.plan_type = 'expert-yearly'
            profile.monthly_image_limit = 2000
        else:
            print(f"Warning: Unknown Stripe Price ID received: {price_id}. Setting to default starter plan.")
            profile.plan_type = 'starter' # Default to starter if unknown
            profile.monthly_image_limit = 500 # Default limit if unknown
            
        # Update billing period dates (only if they were successfully retrieved)
        if new_period_start_ts is not None and new_period_end_ts is not None:
            profile.current_period_start = new_period_start
            profile.current_period_end = new_period_end
    
        profile.save()
        print(f"Updated profile for {profile.user.username}: images_used={profile.images_used_this_month}, period_end={profile.current_period_end}, plan={profile.plan_type}, limit={profile.monthly_image_limit}")
    except UserProfile.DoesNotExist:
        print(f"No profile found for customer {subscription.get('customer', 'N/A')} during subscription update handling.")
    except KeyError as ke:
        print(f"KeyError in handle_subscription_update: {ke}. Missing expected key in subscription object. Full subscription object printed above.")
        # Re-raise to ensure the webhook returns a 400 to Stripe, indicating a processing error
        raise HttpResponseBadRequest(f"Missing expected key in Stripe payload: {ke}")
    except Exception as e:
        print(f"Unhandled exception in handle_subscription_update: {e}")
        raise # Re-raise to ensure it propagates back to the caller for debugging






    
"""

# def handle_subscription_update(subscription):
#     print("Processing subscription update:")
#     try:
#         # Access dictionary keys using [] instead of attributes
#         profile = UserProfile.objects.get(stripe_customer_id=subscription['customer'])

#         print(f"Subscription ID: {subscription['id']}")
#         print(f"Customer: {subscription['customer']}")
#         print(f"Status: {subscription['status']}")


#         # Get the new period dates from Stripe
#         new_period_start_ts = subscription['current_period_start']
#         new_period_end_ts = subscription['current_period_end']


#         # Convert timestamps to datetime and make them timezone-aware
#         new_period_start = make_aware(datetime.fromtimestamp(new_period_start_ts))
#         new_period_end = make_aware(datetime.fromtimestamp(new_period_end_ts))

#         print(f"Stripe's new period: {new_period_start} to {new_period_end}")
#         print(f"Profile's current_period_end BEFORE update: {profile.current_period_end}")

        
#         # Check if this is a new billing period (either first time or cycle renewal)
#         # The key condition for resetting usage is if the new period start is AFTER the *existing* period end
#         if (not profile.current_period_end or new_period_start > profile.current_period_end):
#             # Reset the usage counter for the new period
#             print("Condition met: Resetting usage counter - new billing period")
#             profile.images_used_this_month = 0
#             print(f"Reset usage counter for {profile.user.username} - new billing period started")
#         else:
#             print("Condition NOT met: Usage counter NOT reset. new_period_start <= profile.current_period_end")
#             print(f"  new_period_start: {new_period_start}")
#             print(f"  profile.current_period_end: {profile.current_period_end}")

        
#         # Update basic subscription info
#         profile.subscription_status = subscription['status']
        
        
#          # Update plan info - **CRITICAL CHANGE HERE**
#         price_id = subscription['items']['data'][0]['price']['id']
        
#         if price_id == settings.STRIPE_PRICE_ID_STARTER:
#             profile.plan_type = 'starter'
#             profile.monthly_image_limit = 500
#         elif price_id == settings.STRIPE_PRICE_ID_PRO:
#             profile.plan_type = 'pro'
#             profile.monthly_image_limit = 1000
#         elif price_id == settings.STRIPE_PRICE_ID_EXPERT:
#             profile.plan_type = 'expert'
#             profile.monthly_image_limit = 2000
#         elif price_id == settings.STRIPE_PRICE_ID_STARTER_YEARLY:
#             profile.plan_type = 'starter-yearly'
#             profile.monthly_image_limit = 500 # Assuming same monthly limit for yearly
#         elif price_id == settings.STRIPE_PRICE_ID_PRO_YEARLY:
#             profile.plan_type = 'pro-yearly'
#             profile.monthly_image_limit = 1000 # Assuming same monthly limit for yearly
#         elif price_id == settings.STRIPE_PRICE_ID_EXPERT_YEARLY:
#             profile.plan_type = 'expert-yearly'
#             profile.monthly_image_limit = 2000 # Assuming same monthly limit for yearly
#         else:
#             # Fallback for unknown price IDs, perhaps a free tier or error handling
#             profile.plan_type = 'unknown' # Or 'free'
#             profile.monthly_image_limit = 0 # Or a default free tier limit
#             print(f"Warning: Unknown Stripe Price ID received: {price_id}. Setting to default unknown plan.")
            
            
#         # Update billing period dates
#         profile.current_period_start = new_period_start
#         profile.current_period_end = new_period_end
    
        
        
#         profile.save()
#         print(f"Updated profile for {profile.user.username}: images_used={profile.images_used_this_month}, period_end={profile.current_period_end}")  # Debug log
#     except UserProfile.DoesNotExist:
#         print(f"No profile found for customer {subscription['customer']}")
#         # Consider creating a UserProfile here if it's a new customer from a webhook
#         # For testing, ensure your test_renewal view creates it or it exists.
#     except Exception as e:
#         print(f"Error in handle_subscription_update: {e}")
#         # Re-raise or handle the exception appropriately
#         raise # Re-raise to ensure it propagates back to the caller for debugging

"""       


# New function to handle subscription deletion
def handle_subscription_deleted(subscription):
    print("Processing subscription deletion:")
    try:
        profile = UserProfile.objects.get(stripe_customer_id=subscription['customer'])
        print(f"Subscription ID: {subscription['id']}")
        print(f"Customer: {subscription['customer']}")
        print(f"Status: {subscription['status']}") # Should be 'canceled' or 'unpaid' etc.

        # Set subscription status to 'cancelled' or 'inactive'
        profile.subscription_status = 'cancelled'
        # Set monthly limit to 0 or a very low free tier limit
        profile.monthly_image_limit = 0
        profile.images_used_this_month = 0 # Reset usage as well
        # Optionally, set current_period_end to now if it's an immediate cancellation
        # For 'deleted' event, it typically means the subscription has ended.
        profile.current_period_end = timezone.now() 
        profile.save()
        print(f"Profile for {profile.user.username} updated to cancelled. Limit: {profile.monthly_image_limit}")
    except UserProfile.DoesNotExist:
        print(f"No profile found for customer {subscription['customer']} during deletion handling.")
    except Exception as e:
        print(f"Error in handle_subscription_deleted: {e}")
        raise



# 2nd version - working but not resetting usage and date
# possible timezone problem
"""
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
        # Access dictionary keys using [] instead of attributes
        profile = UserProfile.objects.get(stripe_customer_id=subscription['customer'])

        print(f"Subscription ID: {subscription['id']}")
        print(f"Customer: {subscription['customer']}")
        print(f"Status: {subscription['status']}")
         
        # Get the new period dates from Stripe
        new_period_start_ts = subscription['current_period_start']
        new_period_end_ts = subscription['current_period_end']

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
        profile.subscription_status = subscription['status']
        
        
        # Update plan info
        price_id = subscription['items']['data'][0]['price']['id']
        if price_id == settings.STRIPE_PRICE_ID_PRO:
            profile.plan_type = 'pro'
            profile.monthly_image_limit = 1000
        else:
            profile.plan_type = 'starter'
            profile.monthly_image_limit = 500
            
        # Update billing period dates
        profile.current_period_start = new_period_start
        profile.current_period_end = new_period_end
    
        
        
        profile.save()
        print(f"Updated profile for {profile.user.username}")  # Debug log
    except UserProfile.DoesNotExist:
        print(f"No profile found for customer {subscription['customer']}")
        # Consider creating a UserProfile here if it's a new customer from a webhook
        # For testing, ensure your test_renewal view creates it or it exists.
    except Exception as e:
        print(f"Error in handle_subscription_update: {e}")
        # Re-raise or handle the exception appropriately
        raise # Re-raise to ensure it propagates back to the caller for debugging
"""


"""
It looks like the handle_subscription_update function in webhooks.py is expecting an object with 
attributes (like subscription.customer), but it's receiving a dictionary from your test_renewal view.

To fix this, we need to change how the customer, current_period_start, and current_period_end 
are accessed within the handle_subscription_update function, treating subscription as a dictionary
instead of an object.
"""

"""
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
        
"""

