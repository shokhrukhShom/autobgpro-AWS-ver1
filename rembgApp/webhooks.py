import stripe
from django.http import HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rembgApp.models import UserProfile
from datetime import datetime
from django.utils.timezone import make_aware
from .models import User
from django.utils import timezone # Import timezone



# Enhanced webhook with detailed logging
@csrf_exempt
def stripe_webhook(request):
    print("----------------------------WEBHOOK FUNCTION HIT!----------------------")
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
        
        # Enhanced logging
        print(f"✅ Received event type: {event['type']}")
        print(f"✅ Event ID: {event.get('id', 'N/A')}")
        print(f"✅ Webhook secret being used: {settings.STRIPE_WEBHOOK_SECRET[:20]}...")
        
        # Handle events
        if event['type'] == 'customer.subscription.updated':
            print("🔄 Processing customer.subscription.updated event")
            subscription = event['data']['object']
            handle_subscription_update(subscription)
        elif event['type'] == 'customer.subscription.deleted':
            print("❌ Processing customer.subscription.deleted event")
            subscription = event['data']['object']
            handle_subscription_deleted(subscription)
        else:
            print(f"⚠️ Unhandled event type: {event['type']}")
            
        print("✅ Webhook processing completed successfully")
        return HttpResponse("Webhook received", status=200)
                
    except ValueError as e:
        print(f"❌ ValueError in webhook: {str(e)}")
        return HttpResponseBadRequest(f"Invalid payload: {str(e)}")
    except stripe.error.SignatureVerificationError as e:
        print(f"❌ SignatureVerificationError in webhook: {str(e)}")
        return HttpResponseBadRequest(f"Invalid signature: {str(e)}")
    except Exception as e:
        print(f"❌ Unhandled exception in webhook: {str(e)}")
        import traceback
        traceback.print_exc()
        return HttpResponse(f"Server error: {str(e)}", status=500)


def handle_subscription_update(subscription):
    print("----- 🔄 Processing subscription update: --------")
    
    customer_id = subscription.get('customer')
    print(f"🔍 Looking for UserProfile with stripe_customer_id: {customer_id}")
    
    # Log current settings
    print(f"🔧 Current environment: {getattr(settings, 'ENVIRONMENT', 'not set')}")
    print(f"🔧 STRIPE_PRICE_ID_STARTER: {settings.STRIPE_PRICE_ID_STARTER}")
    print(f"🔧 STRIPE_PRICE_ID_PRO: {settings.STRIPE_PRICE_ID_PRO}")
    print(f"🔧 STRIPE_PRICE_ID_EXPERT: {settings.STRIPE_PRICE_ID_EXPERT}")
    
    try:
        profile = UserProfile.objects.get(stripe_customer_id=customer_id)
        print(f"✅ Found profile for user: {profile.user.username}")
        print(f"📊 Current profile state: plan_type={profile.plan_type}, status={profile.subscription_status}, limit={profile.monthly_image_limit}, used={profile.images_used_this_month}")
        
        # Log subscription details
        print(f"📋 Subscription ID: {subscription.get('id', 'N/A')}")
        print(f"📋 Customer: {subscription.get('customer', 'N/A')}")
        print(f"📋 Status: {subscription.get('status', 'N/A')}")
        
        # Get the price ID from subscription
        try:
            price_id = subscription['items']['data'][0]['price']['id']
            print(f"💰 Price ID from Stripe: {price_id}")
        except (KeyError, IndexError) as e:
            print(f"❌ Error getting price ID: {e}")
            print("📄 Full subscription items structure:")
            print(json.dumps(subscription.get('items', {}), indent=2))
            return
        
        # Safely get period dates
        try:
            subscription_item_data = subscription['items']['data'][0]
            new_period_start_ts = subscription_item_data.get('current_period_start')
            new_period_end_ts = subscription_item_data.get('current_period_end')
            
            print(f"📅 Period timestamps - start: {new_period_start_ts}, end: {new_period_end_ts}")
            
            if new_period_start_ts and new_period_end_ts:
                new_period_start = make_aware(datetime.fromtimestamp(new_period_start_ts))
                new_period_end = make_aware(datetime.fromtimestamp(new_period_end_ts))
                print(f"📅 Converted dates - start: {new_period_start}, end: {new_period_end}")
            else:
                print("⚠️ Using existing profile dates due to missing timestamps")
                new_period_start = profile.current_period_start if profile.current_period_start else timezone.now()
                new_period_end = profile.current_period_end if profile.current_period_end else timezone.now() + timezone.timedelta(days=30)
                
        except Exception as e:
            print(f"❌ Error processing period dates: {e}")
            new_period_start = profile.current_period_start if profile.current_period_start else timezone.now()
            new_period_end = profile.current_period_end if profile.current_period_end else timezone.now() + timezone.timedelta(days=30)
        
        print(f"📅 Profile's current_period_end BEFORE update: {profile.current_period_end}")
        
        # Check if this is a new billing period
        if (not profile.current_period_end or new_period_start > profile.current_period_end):
            print("🔄 Condition met: Resetting usage counter - new billing period")
            profile.images_used_this_month = 0
        else:
            print("⏭️ Condition NOT met: Usage counter NOT reset")
            print(f"  new_period_start: {new_period_start}")
            print(f"  profile.current_period_end: {profile.current_period_end}")
        
        # Update subscription status
        old_status = profile.subscription_status
        profile.subscription_status = subscription.get('status', profile.subscription_status)
        print(f"📊 Status update: {old_status} → {profile.subscription_status}")
        
        # Update plan info based on price_id
        old_plan = profile.plan_type
        old_limit = profile.monthly_image_limit
        
        print(f"🔍 Comparing price_id '{price_id}' with configured price IDs...")
        
        if price_id == settings.STRIPE_PRICE_ID_STARTER:
            print("✅ Matched STARTER plan")
            profile.plan_type = 'starter'
            profile.monthly_image_limit = 500
        elif price_id == settings.STRIPE_PRICE_ID_PRO:
            print("✅ Matched PRO plan")
            profile.plan_type = 'pro'
            profile.monthly_image_limit = 1000
        elif price_id == settings.STRIPE_PRICE_ID_EXPERT:
            print("✅ Matched EXPERT plan")
            profile.plan_type = 'expert'
            profile.monthly_image_limit = 2000
        elif price_id == settings.STRIPE_PRICE_ID_STARTER_YEARLY:
            print("✅ Matched STARTER-YEARLY plan")
            profile.plan_type = 'starter-yearly'
            profile.monthly_image_limit = 500
        elif price_id == settings.STRIPE_PRICE_ID_PRO_YEARLY:
            print("✅ Matched PRO-YEARLY plan")
            profile.plan_type = 'pro-yearly'
            profile.monthly_image_limit = 1000
        elif price_id == settings.STRIPE_PRICE_ID_EXPERT_YEARLY:
            print("✅ Matched EXPERT-YEARLY plan")
            profile.plan_type = 'expert-yearly'
            profile.monthly_image_limit = 2000
        else:
            print(f"❌ Unknown Stripe Price ID received: {price_id}")
            print("🔧 Available price IDs:")
            print(f"  STARTER: {settings.STRIPE_PRICE_ID_STARTER}")
            print(f"  PRO: {settings.STRIPE_PRICE_ID_PRO}")
            print(f"  EXPERT: {settings.STRIPE_PRICE_ID_EXPERT}")
            print(f"  STARTER_YEARLY: {settings.STRIPE_PRICE_ID_STARTER_YEARLY}")
            print(f"  PRO_YEARLY: {settings.STRIPE_PRICE_ID_PRO_YEARLY}")
            print(f"  EXPERT_YEARLY: {settings.STRIPE_PRICE_ID_EXPERT_YEARLY}")
            print("⚠️ Setting to default starter plan")
            profile.plan_type = 'starter'
            profile.monthly_image_limit = 500
            
        print(f"📊 Plan update: {old_plan} → {profile.plan_type}")
        print(f"📊 Limit update: {old_limit} → {profile.monthly_image_limit}")
        
        # Update billing period dates
        profile.current_period_start = new_period_start
        profile.current_period_end = new_period_end
        
        # Save the profile
        profile.save()
        print(f"💾 Profile saved successfully!")
        print(f"📊 Final profile state: plan_type={profile.plan_type}, status={profile.subscription_status}, limit={profile.monthly_image_limit}, used={profile.images_used_this_month}")
        print(f"📅 Final periods: start={profile.current_period_start}, end={profile.current_period_end}")
        
    except UserProfile.DoesNotExist:
        print(f"❌ ERROR: No UserProfile found with stripe_customer_id: {customer_id}")
        # List all existing customer IDs for debugging
        try:
            existing_profiles = UserProfile.objects.all()
            print(f"📋 Total UserProfiles in database: {existing_profiles.count()}")
            for p in existing_profiles:
                print(f"  User: {p.user.username}, Customer ID: {p.stripe_customer_id}")
        except Exception as e:
            print(f"❌ Error listing existing profiles: {e}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error in handle_subscription_update: {e}")
        import traceback
        traceback.print_exc()
        raise


def handle_subscription_deleted(subscription):
    print("Processing subscription deletion:")
    customer_id = subscription.get('customer')
    
    try:
        profile = UserProfile.objects.get(stripe_customer_id=customer_id)
        print(f"✅ Found profile for deletion: {profile.user.username}")
        print(f"📋 Subscription ID: {subscription['id']}")
        print(f"📋 Customer: {subscription['customer']}")
        print(f"📋 Status: {subscription['status']}")

        # Set subscription status to 'cancelled'
        profile.subscription_status = 'cancelled'
        profile.monthly_image_limit = 0
        profile.images_used_this_month = 0
        profile.current_period_end = timezone.now() 
        profile.save()
        print(f"💾 Profile for {profile.user.username} updated to cancelled. Limit: {profile.monthly_image_limit}")
    except UserProfile.DoesNotExist:
        print(f"❌ No profile found for customer {customer_id} during deletion handling.")
    except Exception as e:
        print(f"❌ Error in handle_subscription_deleted: {e}")
        raise




# # 3rd versiion 
# @csrf_exempt
# def stripe_webhook(request):
#     print("----------------------------WEBHOOK FUNCTION HIT!----------------------") # <--- ADD THIS LINE HERE
#     if request.method != 'POST':
#         return HttpResponseBadRequest("Only POST requests are accepted")
    
#     try:
#         payload = request.body
#         sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
#         if not sig_header:
#             return HttpResponseBadRequest("Missing Stripe signature header")
            
#         event = stripe.Webhook.construct_event(
#             payload,
#             sig_header,
#             settings.STRIPE_WEBHOOK_SECRET
#         )
        
        
        
#         # Handle events (same as before)
#         if event['type'] == 'customer.subscription.updated':
#             subscription = event['data']['object']
#             handle_subscription_update(subscription)
#         elif event['type'] == 'customer.subscription.deleted': # New: Handle subscription deletion
#             subscription = event['data']['object']
#             handle_subscription_deleted(subscription)
            
#         # Return success response for other event types
#         return HttpResponse("Webhook received", status=200)
                
#     except ValueError as e:
#         return HttpResponseBadRequest(f"Invalid payload: {str(e)}")
#     except stripe.error.SignatureVerificationError as e:
#         return HttpResponseBadRequest(f"Invalid signature: {str(e)}")
#     except Exception as e:
#         return HttpResponse(status=400)



# def handle_subscription_update(subscription):
#     print("----- Processing subscription update: --------")
#     try:
#         profile = UserProfile.objects.get(stripe_customer_id=subscription['customer'])

#         print(f"Subscription ID: {subscription.get('id', 'N/A')}")
#         print(f"Customer: {subscription.get('customer', 'N/A')}")
#         print(f"Status: {subscription.get('status', 'N/A')}")
        
#         # --- Start Debugging Block ---
#         # print("\n--- Full Stripe Subscription Object (for debugging) ---")
#         # import json
#         # print(json.dumps(subscription, indent=2))
#         # print("----------------------------------------------------\n")
#         # --- End Debugging Block ---

#         # Safely get period dates from the subscription item
#         # These are nested within the 'items' data array
#         subscription_item_data = subscription['items']['data'][0] if subscription['items']['data'] else {}
#         new_period_start_ts = subscription_item_data.get('current_period_start')
#         new_period_end_ts = subscription_item_data.get('current_period_end')

#         if new_period_start_ts is None or new_period_end_ts is None:
#             print("Warning: 'current_period_start' or 'current_period_end' missing from Stripe payload's subscription item. Skipping date updates.")
#             # If these are missing, we might not want to reset usage or update dates
#             # For now, we'll use existing profile dates or default to now if they don't exist
#             new_period_start = profile.current_period_start if profile.current_period_start else timezone.now()
#             new_period_end = profile.current_period_end if profile.current_period_end else timezone.now() + timezone.timedelta(days=30)
#         else:
#             new_period_start = make_aware(datetime.fromtimestamp(new_period_start_ts))
#             new_period_end = make_aware(datetime.fromtimestamp(new_period_end_ts))

#         print(f"Stripe's new period: {new_period_start} to {new_period_end}")
#         print(f"Profile's current_period_end BEFORE update: {profile.current_period_end}")

        
#         # Check if this is a new billing period (either first time or cycle renewal)
#         if (not profile.current_period_end or new_period_start > profile.current_period_end):
#             print("Condition met: Resetting usage counter - new billing period")
#             profile.images_used_this_month = 0
#             print(f"Reset usage counter for {profile.user.username} - new billing period started")
#         else:
#             print("Condition NOT met: Usage counter NOT reset. new_period_start <= profile.current_period_end")
#             print(f"  new_period_start: {new_period_start}")
#             print(f"  profile.current_period_end: {profile.current_period_end}")

        
#         profile.subscription_status = subscription.get('status', profile.subscription_status) # Safely get status
        
#         # Update plan info
#         # The price_id is correctly accessed from the subscription item
#         price_id = subscription['items']['data'][0]['price']['id']

#         print('price id: ', price_id)

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
#             profile.monthly_image_limit = 500
#         elif price_id == settings.STRIPE_PRICE_ID_PRO_YEARLY:
#             profile.plan_type = 'pro-yearly'
#             profile.monthly_image_limit = 1000
#         elif price_id == settings.STRIPE_PRICE_ID_EXPERT_YEARLY:
#             profile.plan_type = 'expert-yearly'
#             profile.monthly_image_limit = 2000
#         else:
#             print(f"Warning: Unknown Stripe Price ID received: {price_id}. Setting to default starter plan.")
#             profile.plan_type = 'starter' # Default to starter if unknown
#             profile.monthly_image_limit = 500 # Default limit if unknown
            
#         # Update billing period dates (only if they were successfully retrieved)
#         if new_period_start_ts is not None and new_period_end_ts is not None:
#             profile.current_period_start = new_period_start
#             profile.current_period_end = new_period_end
    
#         profile.save()
#         print(f"Updated profile for {profile.user.username}: images_used={profile.images_used_this_month}, period_end={profile.current_period_end}, plan={profile.plan_type}, limit={profile.monthly_image_limit}")
#     except UserProfile.DoesNotExist:
#         print(f"No profile found for customer {subscription.get('customer', 'N/A')} during subscription update handling.")
#     except KeyError as ke:
#         print(f"KeyError in handle_subscription_update: {ke}. Missing expected key in subscription object. Full subscription object printed above.")
#         # Re-raise to ensure the webhook returns a 400 to Stripe, indicating a processing error
#         raise HttpResponseBadRequest(f"Missing expected key in Stripe payload: {ke}")
#     except Exception as e:
#         print(f"Unhandled exception in handle_subscription_update: {e}")
#         raise # Re-raise to ensure it propagates back to the caller for debugging      


# # New function to handle subscription deletion
# def handle_subscription_deleted(subscription):
#     print("Processing subscription deletion:")
#     try:
#         profile = UserProfile.objects.get(stripe_customer_id=subscription['customer'])
#         print(f"Subscription ID: {subscription['id']}")
#         print(f"Customer: {subscription['customer']}")
#         print(f"Status: {subscription['status']}") # Should be 'canceled' or 'unpaid' etc.

#         # Set subscription status to 'cancelled' or 'inactive'
#         profile.subscription_status = 'cancelled'
#         # Set monthly limit to 0 or a very low free tier limit
#         profile.monthly_image_limit = 0
#         profile.images_used_this_month = 0 # Reset usage as well
#         # Optionally, set current_period_end to now if it's an immediate cancellation
#         # For 'deleted' event, it typically means the subscription has ended.
#         profile.current_period_end = timezone.now() 
#         profile.save()
#         print(f"Profile for {profile.user.username} updated to cancelled. Limit: {profile.monthly_image_limit}")
#     except UserProfile.DoesNotExist:
#         print(f"No profile found for customer {subscription['customer']} during deletion handling.")
#     except Exception as e:
#         print(f"Error in handle_subscription_deleted: {e}")
#         raise





