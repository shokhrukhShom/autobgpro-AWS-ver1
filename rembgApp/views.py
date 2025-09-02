from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect
#from .forms import UploadPictureForm
from django.urls import reverse
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt 
from .models import User, Uploaded_Pictures, Metadata, Template, UserProfile
import json
from rembg import remove
from PIL import Image
import os
import io
import base64
from django.core.files.base import ContentFile
import re
import time
from django.conf import settings
import uuid
import stripe
import re
from django.contrib.auth import views as auth_views
from django.core.mail import send_mail
from datetime import datetime
from dateutil.relativedelta import relativedelta
from django.utils import timezone
from django.utils.timezone import make_aware, now
from django.contrib import messages
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator
from django.views.decorators.cache import never_cache
import base64


def custom_404_view(request, exception):
    return redirect('login')  # Assuming 'login' is the name of your login URL pattern


def landing_page(request):
    if request.method == "GET":
        return render(request, "rembgApp/landingFolder/landing_page.html")

def layout_landing(request):
    if request.method == "GET":
        return render(request, "rembgApp/landingFolder/layout_landing.html")


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("rmbg"))
        else:
            return render(request, "rembgApp/login.html", {
                "message": "Invalid username and/or password.",
                "form_data": {
                    "username": username,
                    "password": password
                }
            })
    else:
        return render(request, "rembgApp/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("/"))


stripe.api_key = settings.STRIPE_SECRET_KEY

def register(request):
    if request.method == "POST":
        email = request.POST.get("email")
        username = request.POST.get("username")
        password = request.POST.get("password")
        confirmation = request.POST.get("confirmation")
        # Get selected plan            
        plan = request.POST.get("plan")
        
        
        if password != confirmation:
            return render(request, "rembgApp/register.html", {
                "message": "Sorry, passwords did not match. Please, notice Password and Confirm Password must match.",
                "form_data":{
                    "username" : username,
                    "email" : email,
                    "plan" : plan,
                    "focus": "password"
                }
            })
            
         # Check if username or email is taken
        if User.objects.filter(username=username).exists():
            return render(request, "rembgApp/register.html", {
                "message": "Sorry, Username \""+ username +"\" is already taken. Please, choose different username.",
                "form_data" : {
                    "email" : email,
                    "plan" : plan,
                    "password" : password,
                    "focus": "username"
                }
            })
            
        if User.objects.filter(email=email).exists():
            return render(request, "rembgApp/register.html", {
                "message": "Sorry, An account with this email \""+ email +"\" already exists. Please, click forgot password. Or use different email",
                "form_data" : {
                    "username" : username,
                    "plan" : plan,
                    "password" : password,
                    "focus": "email"
                }
            })
            
        if len(password) < 8:
            return render(request, "rembgApp/register.html", {
                "message": "Password must contain a minimum of 8 characters. Please enter a valid password.",
                "form_data": {
                    "username": username,
                    "email": email,
                    "plan": plan,
                    "focus": "password"
                }
            })    
        
        if " " in username or not re.match(r'^\w+$', username):
            return render(request, "rembgApp/register.html", {
                "message": "Sorry, username must be one word with no spaces. Please, create a username with no space",
                "form_data": {
                    "username": username,
                    "email": email,
                    "plan": plan,
                    "focus": "username"
                }
            })    
            
        print("PLAN: ",plan)
        
        

        try:
            
            # Assign the plan to correct PRICE_ID
            if plan == "starter":
                price_id = settings.STRIPE_PRICE_ID_STARTER
            elif plan == "pro":
                price_id = settings.STRIPE_PRICE_ID_PRO
            elif plan == "expert":
                price_id = settings.STRIPE_PRICE_ID_EXPERT
            elif plan == "starter-yearly":
                price_id = settings.STRIPE_PRICE_ID_STARTER_YEARLY
            elif plan == "pro-yearly":
                price_id = settings.STRIPE_PRICE_ID_PRO_YEARLY
            elif plan == "expert-yearly":
                price_id = settings.STRIPE_PRICE_ID_EXPERT_YEARLY
            else:
                return render(request, "rembgApp/register.html", {
                    "message": "Invalid plan selected."
                })
                
            # Create Stripe Checkout Session
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                mode="subscription",
                line_items=[{
                    "price": price_id,
                    "quantity": 1,
                }],
                customer_email=email,
                # success_url=request.build_absolute_uri("/register/success?session_id={CHECKOUT_SESSION_ID}"),
                success_url = f"http://{request.get_host()}/register/success?session_id={{CHECKOUT_SESSION_ID}}",

                cancel_url=request.build_absolute_uri("/register/cancel"),
            )
            
            
            # Temporarily store registration data in session
            request.session["pending_user"] = {
                "username": username,
                "email": email,
                "password": password,
                "plan": plan,
            }
            
            return redirect(session.url)

        except Exception as e:
            return render(request, "rembgApp/register.html", {
                "message": f"Error creating Stripe session: {str(e)}"
            })

    return render(request, "rembgApp/register.html")



def register_success(request):
    try:
        session_id = request.GET.get("session_id")
        if not session_id or "pending_user" not in request.session:
            return redirect("/register")
        
        session = stripe.checkout.Session.retrieve(session_id)
        pending = request.session.pop("pending_user")
        plan_type = pending.get("plan", "")
        
        
        
        print("Pending user session:", pending)
        print("userprofile plan:", plan_type)
        
        # Create user
        user = User.objects.create_user(
            username=pending["username"],
            email=pending["email"],
            password=pending["password"]
        )
        
        
        # Create profile with actual plan details
        if plan_type == "starter":
            monthly_limit = 500
        elif plan_type == "pro":
            monthly_limit = 1000
        elif plan_type == "expert":
            monthly_limit = 2000
        elif plan_type == "starter-yearly":
            monthly_limit = 500
        elif plan_type == "pro-yearly":
            monthly_limit = 1000
        elif plan_type == "expert-yearly":
            monthly_limit = 2000
        else:
            monthly_limit = 500  # default fallback

        now_utc = timezone.now()  
        current_period_start = now_utc.date()
        # Set period end based on plan type
        if plan_type in ["starter", "pro", "expert"]:
            # Add 1 month to the start date
            current_period_end = current_period_start + relativedelta(months=1)
        elif plan_type in ["starter-yearly", "pro-yearly", "expert-yearly"]:
            # Yearly plans - add 1 year
            current_period_end = current_period_start + relativedelta(years=1)
        else:
            # Default fallback (1 month)
            current_period_end = current_period_start + relativedelta(months=1)

        # Make the dates timezone-aware
        current_period_start = make_aware(datetime.combine(current_period_start, datetime.min.time()))
        current_period_end = make_aware(datetime.combine(current_period_end, datetime.min.time()))


        # Create profile with actual plan details
        UserProfile.objects.create(
            user=user,
            stripe_customer_id=session.customer,
            plan_type=plan_type,
            monthly_image_limit=monthly_limit,
            subscription_status='active',
            current_period_start=current_period_start,
            current_period_end=current_period_end,
            images_used_this_month=0
        )
        
        
        
        login(request, user)
        return render(request, "rembgApp/register_success.html")
        
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return redirect("/register")


def register_cancel(request):
    return render(request, "rembgApp/register_cancel.html")    

def forgot_username(request):
    message = None

    if request.method == "POST":
        email = request.POST.get("email")
        users = User.objects.filter(email=email)

        if users.exists():
            usernames = ", ".join(users.values_list("username", flat=True))
            send_mail(
                subject="Your AutoBG Pro Username",
                message=f"Your username(s): {usernames}",
                from_email="noreply@autobgpro.com",
                recipient_list=[email],
            )
        # Always show same message for security
        message = "If that email exists in our system, your username has been sent. Thank you."

    return render(request, "rembgApp/forgot_username.html", {"message": message})



def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("login"))



# @login_required
# def billing_portal(request):
#     session = stripe.billing_portal.Session.create(
#         customer=request.user.userprofile.stripe_customer_id,  # You must save Stripe customer ID when user subscribes
#         return_url="http://127.0.0.1:8000/rmbg",  # Where user goes after managing subscription
#     )
#     return redirect(session.url)

@login_required
def billing_portal(request):
    try:
        # Get or create profile
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        if not profile.stripe_customer_id:
            # This should never happen for new users, but just in case:
            raise ValueError("No Stripe customer ID - please contact support")
        
        session = stripe.billing_portal.Session.create(
            customer=profile.stripe_customer_id,
            return_url=request.build_absolute_uri('/rmbg')
        )
        return redirect(session.url)
        
    except Exception as e:
        from django.contrib import messages
        messages.error(request, "Could not access billing portal. Please contact support.")
        return redirect('/rmbg')
    
    

@login_required
def track_image_usage(request):
    profile = request.user.userprofile
    if profile.images_used_this_month >= profile.monthly_image_limit:
        return JsonResponse({'error': 'Monthly limit exceeded'}, status=403)
    
    profile.images_used_this_month += 1
    profile.save()
    return JsonResponse({'success': True}) 
    
    
@login_required
def api_usage(request):
    
    profile = request.user.userprofile
    
    # --- NEW LOGIC FOR MONTHLY RESET ON YEARLY PLANS ---
    current_date = timezone.now().date()
    #current_date = datetime.strptime('10-5-2025', '%m-%d-%Y').date()  # Testing date

    # Check if the plan is yearly and if a new month has started since the last reset
    if profile.plan_type in ['starter-yearly', 'pro-yearly', 'expert-yearly']:
        if profile.last_monthly_reset_date is None or \
           profile.last_monthly_reset_date.month != current_date.month or \
           profile.last_monthly_reset_date.year != current_date.year:
            
            print(f"Monthly reset triggered for yearly plan for user {profile.user.username}.")
            profile.images_used_this_month = 0
            profile.last_monthly_reset_date = current_date
            profile.save()
    # --- END NEW LOGIC ---

    # Set default reset date to next month if not set or for monthly plans
    reset_date_display = 'N/A' # Default for cancelled or if not easily calculable
    if profile.subscription_status == 'active' and profile.current_period_end:
        if profile.plan_type in ['starter-yearly', 'pro-yearly', 'expert-yearly']:
            # For yearly plans, show the next monthly reset date
            # This will be the 1st of the next month
            next_month = current_date + relativedelta(months=1)
            reset_date_display = next_month.strftime('%b %-d')
        else:
            # For monthly plans, show the actual subscription period end
            reset_date_display = profile.current_period_end.strftime('%b %-d')
    
    
    # Adjust response based on subscription status
    if profile.subscription_status != 'active':
        return JsonResponse({
            'used': profile.images_used_this_month,
            'limit': 0, # Show 0 limit if not active
            'reset_date': 'N/A', # No reset date if cancelled
            'plan': 'Expired',
            'message': 'Subscription Expired. Please renew.'
        })
    else:
        return JsonResponse({
            'used': profile.images_used_this_month,
            'limit': profile.monthly_image_limit,
            'reset_date': reset_date_display, # Use the calculated display date
            'plan': profile.plan_type or 'error, plan not found'  # Fallback to starter
        })
    
    
    

"""
#  This view mainPage not being used. TODO: delete/remove also mainPage.html 
# @login_required
# def mainPage(request):
#     if request.method == "GET":
        
#         # Get the objects by -date by author = request.user aka current user
#         queryset = Uploaded_Pictures.objects.filter(author = request.user).order_by('-createdDate')
        
#         return render(request, 'rembgApp/mainPage.html', {'queryset' : queryset})
    
#     if request.method == "POST":
#         user_id = str(request.user.id)
#         # Access the uploaded files directly from request.FILES
#         images = request.FILES.getlist('image')
        
#         print(images)
        
#         if not images:
#             print("no file uploaded")
#             return render(request, 'rembgApp/mainPage.html', {
#                 "message": "You have not selected images, choose a files first then click upload"
#             }) 
       
#         # Getting latest post_id to create inside the folder of the user
#         try:
#             queryset = Uploaded_Pictures.objects.latest('id')
#             folder_inside_user_id = queryset.id
#             folder_inside_user_id = int(folder_inside_user_id) + 1
            
#         except Uploaded_Pictures.DoesNotExist:
#             folder_inside_user_id = 0
            

#         # Creating directory for uploaded pictures
#         path_save_uploaded_picture = "/home/sh/Desktop/django-rembg-2v/rembg_w_python/media/images/"+"user_id_" + user_id + "/" + "post_id_" + str(folder_inside_user_id)

#         # Check if the directory 
#         if not os.path.exists(path_save_uploaded_picture):
#             # If the directory doesn't exist, create it
#             os.makedirs(path_save_uploaded_picture)
        
#         counter = 0
#         image_names = ""

#         for image in images:

            
#             print(str(counter) + " : " + f"{image}")
           
            
#             with open(path_save_uploaded_picture +"/"+ str(counter)+".jpg", 'wb+') as destination:
#                 image_names = image_names + str(counter)+ ".jpg "
#                 counter = int(counter) + 1  
#                 for chunk in image.chunks():
#                     destination.write(chunk)

#         #print(image_names)
        
#         # Converting/splittin text into array
#         #image_array = image_names.split()
#         #for img in image_array:
#             #print(img)
        
#         # pushing image_names string to sqlite3 database
#         current_user = request.user
        
#         instance = Uploaded_Pictures()
#         instance.author = current_user
#         instance.images_text = image_names
        
#         instance.save()
#         images = ""
            

#         print("_______SUCCESS__________")
        
#         return redirect('mainPage') 
#         #return render(request, 'rembgApp/mainPage.html')
"""



# TEST -----------

"""
For Subscription Renewal:
Access: http://127.0.0.1:8000/test_renewal/?type=renewal
Expected: images_used_after_renewal should be 0, and new_period_end 
should be a future date.

For Subscription Cancellation/Expiration (new test):
Access: http://127.0.0.1:8000/test_renewal/?type=cancellation
Expected: images_used_after_cancellation should be 0, subscription_status 
should be cancelled, and monthly_image_limit should be 0. The api_usage 
endpoint (which rmbg.js calls) will then reflect this status.


Subscription Upgrade (Starter to Pro):
http://127.0.0.1:8000/test_renewal/?type=upgrade

Expected Result: images_used_after_upgrade should not be reset (it should remain 150), 
new_plan_type should be 'pro', and new_monthly_image_limit should be 1000. The period_end_after_upgrade 
should remain the same as the initial current_period_end set for the test.

Subscription Downgrade (Pro to Starter):
http://127.0.0.1:8000/test_renewal/?type=downgrade

Expected Result: images_used_after_downgrade should not be reset (it should remain 700), new_plan_type should
 be 'starter', and new_monthly_image_limit should be 500. The period_end_after_downgrade should remain the same as the 
 initial current_period_end set for the test.

"""


from datetime import datetime, timedelta
from django.utils import timezone
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from rembgApp.models import UserProfile
from dateutil.relativedelta import relativedelta # Import this for easier date calculations

@csrf_exempt  # Temporarily disable CSRF for testing
@login_required
def test_renewal(request):
    try:
        test_type = request.GET.get('type', 'renewal') # 'renewal', 'cancellation', 'upgrade', or 'downgrade'
        customer_id = "cus_SnhRcWL7DZ5I5W" # Consistent test customer ID

        # Ensure a UserProfile exists for the test customer
        profile, created = UserProfile.objects.get_or_create(
            stripe_customer_id=customer_id,
            defaults={
                "user": request.user,
                "plan_type": "starter",
                "monthly_image_limit": 500,
                "images_used_this_month": 0,
                "subscription_status": "active",
                "current_period_start": timezone.now(),
                "current_period_end": timezone.now() + relativedelta(months=1)
            }
        )

        if test_type == 'renewal':
            # Simulate an old subscription period that definitely ended in the past
            simulated_old_period_end = timezone.now() - timedelta(days=35)
            
            # Simulate the new period starting today and ending one month from today
            simulated_new_period_start = timezone.now()
            simulated_new_period_end = timezone.now() + relativedelta(months=1)

            test_data = {
                "id": "sub_test_renewal_id_v3",
                "object": "subscription",
                "customer": customer_id,
                "status": "active",
                "current_period_start": int(simulated_new_period_start.timestamp()),
                "current_period_end": int(simulated_new_period_end.timestamp()),
                "items": {
                    "data": [{
                        "id": "si_test123",
                        "object": "subscription_item",
                        "price": {
                            "id": settings.STRIPE_PRICE_ID_PRO, # Use PRO price for renewal test
                            "object": "price"
                        },
                        "quantity": 1
                    }]
                }
            }

            # Set profile to a state where renewal should trigger reset
            profile.images_used_this_month = 300
            profile.current_period_end = simulated_old_period_end
            profile.save()
            print(f"Existing profile updated for renewal test: images_used_this_month={profile.images_used_this_month}, current_period_end={profile.current_period_end}")

            from .webhooks import handle_subscription_update
            handle_subscription_update(test_data)
            
            profile.refresh_from_db()
            return JsonResponse({
                "status": "success",
                "test_scenario": "renewal",
                "images_used_after_renewal": profile.images_used_this_month,
                "new_period_end": profile.current_period_end.strftime('%Y-%m-%d %H:%M:%S %Z'),
                "plan_type": profile.plan_type,
                "monthly_image_limit": profile.monthly_image_limit
            })

        elif test_type == 'cancellation':
            # Simulate a subscription deletion event
            test_data = {
                "id": "sub_test_cancellation_id",
                "object": "subscription",
                "customer": customer_id,
                "status": "canceled", # Stripe sets status to 'canceled' on deletion
                "current_period_end": int(timezone.now().timestamp()), # Subscription ends now for test
                "items": { # Items might still be present, but not relevant for deletion logic
                    "data": []
                }
            }
            
            # Set profile to an active state before cancellation
            profile.plan_type = 'pro'
            profile.monthly_image_limit = 1000
            profile.images_used_this_month = 50
            profile.subscription_status = 'active'
            profile.current_period_end = timezone.now() + timedelta(days=10) # Still active for 10 more days
            profile.save()
            print(f"Existing profile updated for cancellation test: images_used_this_month={profile.images_used_this_month}, subscription_status={profile.subscription_status}")

            from .webhooks import handle_subscription_deleted
            handle_subscription_deleted(test_data)

            profile.refresh_from_db()
            return JsonResponse({
                "status": "success",
                "test_scenario": "cancellation",
                "images_used_after_cancellation": profile.images_used_this_month,
                "subscription_status": profile.subscription_status,
                "monthly_image_limit": profile.monthly_image_limit,
                "period_end_after_cancellation": profile.current_period_end.strftime('%Y-%m-%d %H:%M:%S %Z')
            })

        elif test_type == 'upgrade':
            # Simulate an upgrade from Starter to Pro
            # Set profile to starter plan initially
            profile.plan_type = 'starter'
            profile.monthly_image_limit = 500
            profile.images_used_this_month = 150 # Some usage before upgrade
            profile.subscription_status = 'active'
            # Ensure current_period_end is in the future, so usage doesn't reset
            profile.current_period_end = timezone.now() + timedelta(days=15) 
            profile.save()
            print(f"Existing profile updated for upgrade test (initial): images_used_this_month={profile.images_used_this_month}, plan_type={profile.plan_type}")

            test_data = {
                "id": "sub_test_upgrade_id",
                "object": "subscription",
                "customer": customer_id,
                "status": "active",
                "current_period_start": int(profile.current_period_start.timestamp()), # Should be same as current
                "current_period_end": int(profile.current_period_end.timestamp()),   # Should be same as current
                "items": {
                    "data": [{
                        "id": "si_test_upgrade_item",
                        "object": "subscription_item",
                        "price": {
                            "id": settings.STRIPE_PRICE_ID_PRO, # New plan: PRO
                            "object": "price"
                        },
                        "quantity": 1
                    }]
                }
            }
            from .webhooks import handle_subscription_update
            handle_subscription_update(test_data)

            profile.refresh_from_db()
            return JsonResponse({
                "status": "success",
                "test_scenario": "upgrade",
                "images_used_after_upgrade": profile.images_used_this_month, # Should NOT reset
                "subscription_status": profile.subscription_status,
                "new_plan_type": profile.plan_type,
                "new_monthly_image_limit": profile.monthly_image_limit,
                "period_end_after_upgrade": profile.current_period_end.strftime('%Y-%m-%d %H:%M:%S %Z') # Should be same
            })

        elif test_type == 'downgrade':
            # Simulate a downgrade from Pro to Starter
            # Set profile to pro plan initially
            profile.plan_type = 'pro'
            profile.monthly_image_limit = 1000
            profile.images_used_this_month = 700 # Some usage before downgrade
            profile.subscription_status = 'active'
            # Ensure current_period_end is in the future, so usage doesn't reset
            profile.current_period_end = timezone.now() + timedelta(days=15) 
            profile.save()
            print(f"Existing profile updated for downgrade test (initial): images_used_this_month={profile.images_used_this_month}, plan_type={profile.plan_type}")

            test_data = {
                "id": "sub_test_downgrade_id",
                "object": "subscription",
                "customer": customer_id,
                "status": "active",
                "current_period_start": int(profile.current_period_start.timestamp()), # Should be same as current
                "current_period_end": int(profile.current_period_end.timestamp()),   # Should be same as current
                "items": {
                    "data": [{
                        "id": "si_test_downgrade_item",
                        "object": "subscription_item",
                        "price": {
                            "id": settings.STRIPE_PRICE_ID_STARTER, # New plan: STARTER
                            "object": "price"
                        },
                        "quantity": 1
                    }]
                }
            }
            from .webhooks import handle_subscription_update
            handle_subscription_update(test_data)

            profile.refresh_from_db()
            return JsonResponse({
                "status": "success",
                "test_scenario": "downgrade",
                "images_used_after_downgrade": profile.images_used_this_month, # Should NOT reset
                "subscription_status": profile.subscription_status,
                "new_plan_type": profile.plan_type,
                "new_monthly_image_limit": profile.monthly_image_limit,
                "period_end_after_downgrade": profile.current_period_end.strftime('%Y-%m-%d %H:%M:%S %Z') # Should be same
            })

        else:
            return JsonResponse({"error": "Invalid test type. Use 'renewal', 'cancellation', 'upgrade', or 'downgrade'."}, status=400)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)  
  
 
    
# END Test-----------------

@csrf_exempt
@login_required
def uploadImg(request):
    
    # if request get display uploadImg.html
    if request.method == "GET":
        return render(request, "rembgApp/uploadImg.html")
    
import time
import random
            
# Get and Post rmbg.html page   
@csrf_exempt
@login_required
def rmbg(request):
        
    # Get the latest upload by current user
    latest_upload = Uploaded_Pictures.objects.filter(author=request.user).order_by('-id')
    user_id = str(request.user.id)

    latest_valid_upload = None

    # If user has uploaded images before
    if latest_upload:
        # Check each upload to find the latest one that has processed images
        for upload in latest_upload:
            # For S3 storage, we need to use the storage backend instead of os.path
            # The S3 path structure would be: images/user_id_{user_id}/post_id_{upload.id}/cropped/
            s3_cropped_prefix = f"images/user_id_{user_id}/post_id_{upload.id}/cropped/"
            
            try:
                # Use Django's storage backend (works with both local and S3)
                from django.core.files.storage import default_storage
                
                # Check if the cropped directory exists in S3
                # default_storage.listdir() returns (subdirectories, files)
                subdirs, files = default_storage.listdir(s3_cropped_prefix)
                
                # Check if there are any PNG files in the directory
                has_png_files = any(fname.lower().endswith('.png') for fname in files)
                
                if has_png_files:
                    latest_valid_upload = upload
                    print(f"Found valid upload: post_id {upload.id} with {len(files)} processed images")
                    break
                else:
                    print(f"Upload {upload.id} exists but has no PNG files")
                    
            except FileNotFoundError:
                # Directory doesn't exist in S3 yet (still processing or failed)
                print(f"Upload {upload.id} cropped directory not found in S3")
                continue
            except Exception as e:
                print(f"Error checking S3 for upload {upload.id}: {str(e)}")
                continue
        
        # Assign the latest valid upload ID if found
        if latest_valid_upload:
            latest_upload_id = latest_valid_upload.id
            print(f"Using latest valid upload ID: {latest_upload_id}")
        else:
            # No valid uploads found with processed images
            latest_upload_id = None
            print("No valid uploads found with processed images")
    else:
        # No uploads at all
        latest_upload_id = None
        print("User has no uploads yet")
        # Handle case where user has no uploads
        if request.method == "GET":
            sorted_rembg_files_path = []
            context = {
                "sorted_rembg_files_path" : sorted_rembg_files_path
            }
            return render(request, "rembgApp/rmbg.html", context)

    if request.method == "GET":

        # Current background image--------------
        picture = get_object_or_404(Uploaded_Pictures, id=latest_upload_id)
        current_bg = picture.background_image
        
        
        # S3 storage implementation for accessing processed images
        rembg_files_path = []

        if latest_upload_id:
            # For S3 storage, we use a prefix (key prefix) instead of local filesystem path
            # S3 prefix structure: images/user_id_{user_id}/post_id_{latest_upload_id}/cropped/
            s3_cropped_prefix = f"images/user_id_{user_id}/post_id_{latest_upload_id}/cropped/"
            
            try:
                # Use Django's storage backend (works for both local and S3)
                from django.core.files.storage import default_storage
                
                # List files in the S3 directory
                # default_storage.listdir() returns (subdirectories, files)
                subdirs, files = default_storage.listdir(s3_cropped_prefix)
                
                #print(f"Found {len(files)} files in S3 directory: {s3_cropped_prefix}")
                
                # Filter for PNG files and sort them numerically
                png_files = [f for f in files if f.lower().endswith('.png')]
                
                # Sort files numerically by their base name (0.png, 1.png, 2.png, etc.)
                try:
                    png_files.sort(key=lambda x: int(os.path.splitext(x)[0]))
                except ValueError:
                    # Fallback: if filenames aren't numeric, use natural sort
                    png_files.sort()
                
                # Generate S3 URLs for each file
                for filename in png_files:
                    # Construct the full S3 key for this file
                    s3_key = f"{s3_cropped_prefix}{filename}"
                    
                    # Get the public URL for the S3 object
                    # default_storage.url() generates a pre-signed URL that expires
                    file_url = default_storage.url(s3_key)
                    
                    # Add cache-busting parameter to prevent browser caching
                    cache_buster = int(time.time() * 1000)
                    file_url_with_cache = f"{file_url}?v={cache_buster}"
                    
                    rembg_files_path.append(file_url_with_cache)
                    #print(f"Added S3 image: {file_url_with_cache}")
                    
            except FileNotFoundError:
                print(f"S3 directory not found: {s3_cropped_prefix}")
                # Directory doesn't exist yet (images still processing)
                rembg_files_path = []
            except Exception as e:
                print(f"Error accessing S3 images: {str(e)}")
                rembg_files_path = []
        else:
            # No valid upload ID
            rembg_files_path = []
            
                
        
        # Sort by the numeric part of the filenames (code from chatgpt)
        sorted_rembg_files_path = sorted(rembg_files_path, key=lambda x: int(os.path.splitext(os.path.basename(x))[0]))
        #PNG images ------Finish--------

        # Loop through Background Image Folder (bg-templates/default)--------------------
        bg_img_paths = []
        
        # Production with S3 - use storage backend
        from django.core.files.storage import default_storage
        
        # S3 path (key) where background templates are stored
        # Note: This is NOT a filesystem path, but an S3 object key
        s3_bg_prefix = "bg-templates/default/"
        
        try:
            # default_storage.listdir() works with S3 and returns (subdirectories, files)
            # This is the S3 equivalent of os.listdir()
            subdirs, files = default_storage.listdir(s3_bg_prefix)
            
            #print(f"Found {len(files)} files in S3 directory: {s3_bg_prefix}")
            
            for filename in files:
                if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                    # Construct the full S3 key for this file
                    s3_key = f"{s3_bg_prefix}{filename}"
                    
                    # Get the public URL for the S3 object
                    # default_storage.url() generates a signed URL with expiration
                    file_url = default_storage.url(s3_key)
                    
                    bg_img_paths.append(file_url)
                    #3print(f"Added S3 background: {file_url}")
                    
        except FileNotFoundError:
            print(f"S3 directory not found: {s3_bg_prefix}")
        except Exception as e:
            print(f"Error accessing S3 background templates: {str(e)}")
                
                
        #-------------        
        
        # Garage Folder BG
        bg_img_paths_garage = []
        
        
         # Production with S3 - use storage backend
        from django.core.files.storage import default_storage
        
        # S3 path (key) where background templates are stored
        # Note: This is NOT a filesystem path, but an S3 object key
        s3_bg_prefix = "bg-templates/garage/"
        
        try:
            # default_storage.listdir() works with S3 and returns (subdirectories, files)
            # This is the S3 equivalent of os.listdir()
            subdirs, files = default_storage.listdir(s3_bg_prefix)
            
            print(f"Found {len(files)} files in S3 directory: {s3_bg_prefix}")
            
            for filename in files:
                if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                    # Construct the full S3 key for this file
                    s3_key = f"{s3_bg_prefix}{filename}"
                    
                    # Get the public URL for the S3 object
                    # default_storage.url() generates a signed URL with expiration
                    file_url = default_storage.url(s3_key)
                    
                    bg_img_paths_garage.append(file_url)
                    print(f"Added S3 background: {file_url}")
                    
        except FileNotFoundError:
            print(f"S3 directory not found: {s3_bg_prefix}")
        except Exception as e:
            print(f"Error accessing S3 background templates: {str(e)}")
            
        #-------------
                
                
                
                
        
        # Road Folder BG        
        bg_img_paths_road = []
        # Production with S3 - use storage backend
        from django.core.files.storage import default_storage
        
        # S3 path (key) where background templates are stored
        # Note: This is NOT a filesystem path, but an S3 object key
        s3_bg_prefix = "bg-templates/road/"
        
        try:
            # default_storage.listdir() works with S3 and returns (subdirectories, files)
            # This is the S3 equivalent of os.listdir()
            subdirs, files = default_storage.listdir(s3_bg_prefix)
            
            print(f"Found {len(files)} files in S3 directory: {s3_bg_prefix}")
            
            for filename in files:
                if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                    # Construct the full S3 key for this file
                    s3_key = f"{s3_bg_prefix}{filename}"
                    
                    # Get the public URL for the S3 object
                    # default_storage.url() generates a signed URL with expiration
                    file_url = default_storage.url(s3_key)
                    
                    bg_img_paths_road.append(file_url)
                    print(f"Added S3 background: {file_url}")
                    
        except FileNotFoundError:
            print(f"S3 directory not found: {s3_bg_prefix}")
        except Exception as e:
            print(f"Error accessing S3 background templates: {str(e)}") 
                
                
        # User uploaded background ------------------------------
        bg_img_paths_user = []
        user_bg_prefix = f"user_upload/user_id_{user_id}/user_backgrounds/"

        try:
            # Use S3 storage to list files
            from django.core.files.storage import default_storage
            
            # List files in the S3 directory
            dirs, files = default_storage.listdir(user_bg_prefix)
            
            for filename in files:
                if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                    # Construct the S3 key
                    s3_key = f"{user_bg_prefix}{filename}"
                    
                    # Get the URL for the file
                    file_url = default_storage.url(s3_key)
                    
                    bg_img_paths_user.append(file_url)
        except FileNotFoundError:
            # Directory doesn't exist yet (no backgrounds uploaded)
            print(f"No user backgrounds found in S3 for user {user_id}")
        except Exception as e:
            print(f"Error listing user backgrounds from S3: {str(e)}")                    
        
        context = {
            'now': now(), 
            "latest_upload_id" : latest_upload_id,
            'current_bg' : current_bg,
            'sorted_rembg_files_path': sorted_rembg_files_path,
            "bg_img_paths" : bg_img_paths,
            "bg_img_paths_garage": bg_img_paths_garage,
            "bg_img_paths_road": bg_img_paths_road,
            "user_backgrounds": bg_img_paths_user,
            }
        

        return render(request, "rembgApp/rmbg.html", context)
        #return HttpResponse("output folder exist. <br> To do: Show images from output folder")     
    
    # inserting background picture
    if request.method == "POST":
        
        print("_____Post request processing: save new background path_______")
        data = json.loads(request.body)
        background_path = data.get('text')
        print("Data recieved: " + background_path + "_________")

        #save background picture name to DB
        # Get the specific Uploaded_Pictures instance using `id`
        uploaded_picture = get_object_or_404(Uploaded_Pictures, id=latest_upload_id)
        uploaded_picture.background_image = background_path
        uploaded_picture.save()

        return redirect("rmbg")

# template.js updating bg with template select
@csrf_exempt
@login_required
def update_background(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            project_id = data.get('project_id')
            background_path = data.get('background_path')
            
            if not project_id:
                return JsonResponse({'error': 'Project ID is required'}, status=400)
                
            project = get_object_or_404(Uploaded_Pictures, id=project_id, author=request.user)
            
            # Only update if background_path is provided, not empty, and not just whitespace
            if background_path and background_path.strip():
                project.background_image = background_path.strip()
                project.save()
                print(f"Background updated to: {background_path.strip()}")
            else:
                print("Background path is empty or None, keeping existing background")
            
            return JsonResponse({'status': 'success'})
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)


@csrf_exempt
@login_required
def upload_background(request):
    if request.method == 'POST' and request.FILES.get('image'):
        user_id = str(request.user.id)
        uploaded_file = request.FILES['image']
        
        # Check current number of backgrounds
        from django.core.files.storage import default_storage
        user_bg_prefix = f"user_upload/user_id_{user_id}/user_backgrounds/"
        
        # Count existing background images (this might need optimization for large numbers)
        existing_files = default_storage.listdir(user_bg_prefix)[1]
        current_count = len([f for f in existing_files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif'))])
        
        if current_count >= 20:
            return JsonResponse({
                'error': 'You can only have up to 20 background uploads. Delete old pictures to upload more.',
                'limit_reached': True
            }, status=400)
        
        # Create a unique filename
        file_ext = os.path.splitext(uploaded_file.name)[1]
        file_name = f"{uuid.uuid4().hex}{file_ext}"
        s3_key = f"{user_bg_prefix}{file_name}"
        
        # Save to S3
        default_storage.save(s3_key, uploaded_file)
                
        # Return image URL
        file_url = default_storage.url(s3_key)
        return JsonResponse({'url': file_url})

    return JsonResponse({'error': 'Invalid request'}, status=400)



@csrf_exempt
@login_required
def delete_background(request, image_id):
    if request.method == 'POST':
        try:
            user_id = request.user.id
            data = json.loads(request.body)
            image_path = data.get('image_path', '')

            # Extract filename from path safely
            filename = os.path.basename(image_path)
            
            # Build the S3 key (not local filesystem path)
            s3_key = f"user_upload/user_id_{user_id}/user_backgrounds/{filename}"
            
            # Security check - ensure the file belongs to this user
            expected_prefix = f"user_upload/user_id_{user_id}/user_backgrounds/"
            if not s3_key.startswith(expected_prefix):
                return JsonResponse({'error': 'Invalid file path'}, status=400)

            # Use S3 storage to delete the file
            from django.core.files.storage import default_storage
            
            if default_storage.exists(s3_key):
                default_storage.delete(s3_key)
                return JsonResponse({'success': True})
            else:
                return JsonResponse({'error': 'File does not exist'}, status=404)
                
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)



# Send background job to Celery when image uploaded
from .tasks import process_images_task
import os
from django.conf import settings
from django.core.files.storage import default_storage

@csrf_exempt
@login_required
def imageProcessing(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method"}, status=405)

    try:
        print("_____imageProcessing started_______")
        profile = request.user.userprofile
        uploaded_files = request.FILES.getlist('images')
        files_count = len(uploaded_files)

        if not uploaded_files:
            return JsonResponse({"error": "No images uploaded"}, status=400)

        if profile.images_used_this_month + files_count > profile.monthly_image_limit:
            return JsonResponse({"error": "You've reached your monthly limit."}, status=403)

        # Create DB record first
        instance = Uploaded_Pictures.objects.create(
            author=request.user,
            images_text="",
            rmbg_picture=""
        )

        user_id = request.user.id
        post_id = instance.id

        # Use S3 paths (relative to media root)
        s3_base_path = f"images/user_id_{user_id}/post_id_{post_id}"
        initial_upload_path = f"{s3_base_path}/initialUpload"
        
        # Ensure the S3 directory structure exists by creating a dummy file first
        from django.core.files.storage import default_storage
        dummy_path = f"{initial_upload_path}/.keep"
        if not default_storage.exists(dummy_path):
            default_storage.save(dummy_path, ContentFile(b''))
        
        # Save uploaded images to S3 with proper numeric naming
        image_names = []
        for counter, image in enumerate(uploaded_files):
            filename = f"{counter}.jpg"  # Ensure numeric naming: 0.jpg, 1.jpg, 2.jpg, etc.
            s3_key = f"{initial_upload_path}/{filename}"
            
            # Process image
            img = Image.open(image)
            original_width, original_height = img.width, img.height
            
            # Resize if needed
            if original_width > 1200 or original_height > 1200:
                width_scale = 1200 / original_width
                height_scale = 1200 / original_height
                scale_factor = min(width_scale, height_scale)
                new_width = int(original_width * scale_factor)
                new_height = int(original_height * scale_factor)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save to buffer
            buffer = io.BytesIO()
            img.save(buffer, "JPEG", quality=90)
            buffer.seek(0)
            
            # Upload to S3
            default_storage.save(s3_key, ContentFile(buffer.getvalue()))
            
            image_names.append(filename)
            print(f"Uploaded {s3_key} to S3")

        instance.images_text = " ".join(image_names)
        instance.rmbg_picture = " ".join(image_names)
        instance.save()

        # Track usage
        profile.images_used_this_month += files_count
        profile.save()

        # Send to Celery with S3 paths
        process_images_task.delay(user_id, post_id, initial_upload_path, 
                                 f"{s3_base_path}/rembg", f"{s3_base_path}/cropped")

        return JsonResponse({
            "message": "Upload received. Processing in background.",
            "post_id": post_id,
            "file_count": files_count
        }, status=201)

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"ERROR in imageProcessing: {error_traceback}")
        
        return JsonResponse({
            "error": "Internal server error",
            "details": str(e)
        }, status=500)


@csrf_exempt
@login_required
def check_processing_status(request, post_id):
    print("_____check_processing_status started 2_______")
    try:
        # Get the project
        project = Uploaded_Pictures.objects.get(id=post_id, author=request.user)
        
        # Get expected number of files from the original upload
        expected_files = len(project.images_text.split()) if project.images_text else 0
        
        # Check if processing is complete by looking for cropped images in S3
        user_id = request.user.id
        cropped_path = f"images/user_id_{user_id}/post_id_{post_id}/cropped"
        
        # Use Django's storage backend to check S3
        from django.core.files.storage import default_storage
        
        # Check if the cropped directory exists and has files in S3
        try:
            # List files in the cropped directory
            _, files = default_storage.listdir(cropped_path)
            
            # Filter for image files
            image_files = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
            processed_count = len(image_files)
            
            # Check if all expected files are processed
            if processed_count >= expected_files and expected_files > 0:
                return JsonResponse({
                    'status': 'complete',
                    'message': 'Processing complete',
                    'processed_count': processed_count,
                    'expected_count': expected_files
                })
            elif processed_count > 0:
                return JsonResponse({
                    'status': 'processing',
                    'message': f'Processing... {processed_count}/{expected_files} images completed',
                    'processed_count': processed_count,
                    'expected_count': expected_files
                })
            else:
                return JsonResponse({
                    'status': 'processing',
                    'message': 'Still processing - no images found yet',
                    'processed_count': 0,
                    'expected_count': expected_files
                })
                
        except FileNotFoundError:
            return JsonResponse({
                'status': 'processing',
                'message': 'Still processing - directory not found',
                'processed_count': 0,
                'expected_count': expected_files
            })
        except Exception as dir_error:
            # If listdir fails, the directory might not exist yet
            return JsonResponse({
                'status': 'processing',
                'message': f'Still processing - {str(dir_error)}',
                'processed_count': 0,
                'expected_count': expected_files
            })
            
    except Uploaded_Pictures.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': 'Project not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)



@csrf_exempt
@login_required
def save_image_edit(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            image_data = data.get("image")
            image_path = data.get("image_path", "")
            filename = data.get("filename")
            
            if not image_data or not image_path:
                return JsonResponse({"status": "error", "message": "Missing image data or path"}, status=400)
            
            if not filename:
                filename = os.path.basename(image_path)
            
            if not filename or not filename.lower().endswith('.png'):
                return JsonResponse({"status": "error", "message": "Invalid filename format"}, status=400)
            
            # Parse path to get user_id and project_id
            path_parts = image_path.split('/')
            user_id = None
            project_id = None
            
            for i, part in enumerate(path_parts):
                if part.startswith('user_id_'):
                    user_id = part.replace('user_id_', '')
                elif part.startswith('post_id_'):
                    project_id = part.replace('post_id_', '')
            
            if not user_id or not project_id:
                return JsonResponse({"status": "error", "message": "Invalid image path format"}, status=400)
            
            # S3 paths
            rembg_s3_key = f"images/user_id_{user_id}/post_id_{project_id}/rembg/{filename}"
            cropped_s3_key = f"images/user_id_{user_id}/post_id_{project_id}/cropped/{filename}"
            
            # Remove existing files from S3 if they exist
            from django.core.files.storage import default_storage
            if default_storage.exists(rembg_s3_key):
                default_storage.delete(rembg_s3_key)
            if default_storage.exists(cropped_s3_key):
                default_storage.delete(cropped_s3_key)
            
            # Save the new image to S3 (rembg folder)
            format, imgstr = image_data.split(';base64,') 
            ext = format.split('/')[-1]
            
            image_content = ContentFile(base64.b64decode(imgstr))
            default_storage.save(rembg_s3_key, image_content)
            
            # Process cropped version
            try:
                # Download from S3 to process
                rembg_file = default_storage.open(rembg_s3_key)
                img = Image.open(rembg_file)
                
                bbox = img.getbbox()
                if bbox:
                    cropped_img = img.crop(bbox)
                    
                    # Save cropped image to buffer
                    buffer = io.BytesIO()
                    cropped_img.save(buffer, format='PNG')
                    buffer.seek(0)
                    
                    # Upload cropped image to S3
                    default_storage.save(cropped_s3_key, buffer)
                else:
                    # Copy original to cropped folder
                    rembg_file.seek(0)
                    default_storage.save(cropped_s3_key, rembg_file)
                
                rembg_file.close()
            
            except Exception as e:
                print(f"Error cropping image: {str(e)}")
                # Copy original to cropped folder
                rembg_file = default_storage.open(rembg_s3_key)
                default_storage.save(cropped_s3_key, rembg_file)
                rembg_file.close()
            
            return JsonResponse({
                "status": "success", 
                "rembg_path": rembg_s3_key.replace('media/', ''),
                "cropped_path": cropped_s3_key.replace('media/', ''),
                "rembg_absolute_url": default_storage.url(rembg_s3_key),
                "cropped_absolute_url": default_storage.url(cropped_s3_key),
                "saved_filename": filename
            })

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    else:
        return JsonResponse({"status": "error", "message": "Invalid request method"}, status=400)
    



@csrf_exempt
@login_required
def save_metadata(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Handle both old format (metadata list) and new format (designData)
            if 'metadata' in data:
                # Original shadow settings format
                return handle_shadow_settings(request, data)
            elif 'elements' in data:
                # New design elements format
                return handle_design_elements(request, data)
            else:
                return JsonResponse({'error': 'Invalid data format'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

def handle_shadow_settings(request, data):
    metadata_list = data.get('metadata', [])
    for meta in metadata_list:
        project_id = meta.get('project_id')
        if not project_id:
            return JsonResponse({'error': 'Project ID is required'}, status=400)

        try:
            project = Uploaded_Pictures.objects.get(id=project_id, author=request.user)
        except Uploaded_Pictures.DoesNotExist:
            return JsonResponse({'error': 'Project not found or access denied'}, status=404)

        image_path = meta.get('imagePath')
        metadata, created = Metadata.objects.get_or_create(
            project=project,
            image_path=image_path,
            defaults={
                'shadow_offset_y': meta.get('shadowOffsetY', 0),
                'shadow_blur': meta.get('shadowBlur', 0),
                'shadow_color': meta.get('shadowColor', 'rgba(0, 0, 0, 0.7)'),
                'image_x': meta.get('imageX', 0),
                'image_y': meta.get('imageY', 0),
                'image_scale': meta.get('imageScale', 1)
            }
        )

        if not created:
            metadata.shadow_offset_y = meta.get('shadowOffsetY', metadata.shadow_offset_y)
            metadata.shadow_blur = meta.get('shadowBlur', metadata.shadow_blur)
            metadata.shadow_color = meta.get('shadowColor', metadata.shadow_color)
            metadata.image_x = meta.get('imageX', metadata.image_x)
            metadata.image_y = meta.get('imageY', metadata.image_y)
            metadata.image_scale = meta.get('imageScale', metadata.image_scale)
            metadata.save()

    return JsonResponse({'message': 'Shadow settings saved successfully!'}, status=201)

def handle_design_elements(request, data):
    elements = data.get('elements', [])
    for element in elements:
        project_id = element.get('project_id') or data.get('project_id')
        if not project_id:
            return JsonResponse({'error': 'Project ID is required'}, status=400)

        try:
            project = Uploaded_Pictures.objects.get(id=project_id, author=request.user)
        except Uploaded_Pictures.DoesNotExist:
            return JsonResponse({'error': 'Project not found or access denied'}, status=404)

        image_path = element.get('image_path')
        if image_path is None:
            print("Error: no image path!!!!")
            
            
        image_path = element.get('image_path')
        if image_path is None:
            print("Error: no image path!!!!")

        # Only prepend MEDIA_URL if it's a relative path
        if not image_path.startswith("http"):
            image_path = settings.MEDIA_URL + image_path.lstrip('/')

        print("image path:", image_path)
        
        design_data = element.get('design_data', {})
        print("image path: ",image_path)

        # Update background image if included in design_data True or Flase
        # if 'background_path' in design_data and design_data['background_path']:
        #     project.background_image = design_data['background_path']
        
        # Update project background image only if new background_path is not empty
        new_background_path = design_data.get('background_path')
        if new_background_path:  # This checks for non-empty, non-None values
            print("Updating project background image to:", new_background_path)
            project.background_image = new_background_path
            project.save()
        else:
            print("No new background path provided; keeping existing background image.")
            

        # Use same pattern as handle_shadow_settings
        metadata, created = Metadata.objects.get_or_create(
            project=project,
            image_path=image_path,
            defaults={
                # Include all fields with defaults like shadow settings does
                'header_height': design_data.get('header', {}).get('height', 0),
                'header_color': design_data.get('header', {}).get('color', '#000000'),
                'header_opacity': design_data.get('header', {}).get('opacity', 1.0),
                
                'footer_height': design_data.get('footer', {}).get('height', 0),
                'footer_color': design_data.get('footer', {}).get('color', '#000000'),
                'footer_opacity': design_data.get('footer', {}).get('opacity', 1.0),
                
                'texts': design_data.get('texts', []),
                
                'logo_path': "https://autobgpro-bkt.s3.amazonaws.com" + design_data.get('logo_path', "Not Given") if design_data.get('logo_path') else "Not Given",
                'logo_x': design_data.get('logo_x', 100),
                'logo_y': design_data.get('logo_y', 100),
                'logo_scale': design_data.get('logo_scale', 0.1), 

                # 'background_path': design_data.get('background_path', None)  # Save background path to metadata
                'background_path': design_data.get('background_path') if design_data.get('background_path') else None  # Only set if not empty
            }
        )

        if not created:
            # Update only the design-related fields (like shadow updates specific fields)
            if 'header' in design_data:
                metadata.header_height = design_data['header'].get('height', metadata.header_height)
                metadata.header_color = design_data['header'].get('color', metadata.header_color)
                metadata.header_opacity = design_data['header'].get('opacity', metadata.header_opacity)
            
            if 'footer' in design_data:
                metadata.footer_height = design_data['footer'].get('height', metadata.footer_height)
                metadata.footer_color = design_data['footer'].get('color', metadata.footer_color)
                metadata.footer_opacity = design_data['footer'].get('opacity', metadata.footer_opacity)
            
            if 'texts' in design_data:
                metadata.texts = design_data['texts'] if design_data['texts'] is not None else metadata.texts
                
            # Update logo properties if they exist in the design_data
            # if 'logo_path' in design_data:
            #     metadata.logo_path = design_data['logo_path']
            
            if 'logo_x' in design_data:
                metadata.logo_x = design_data['logo_x']
            if 'logo_y' in design_data:
                metadata.logo_y = design_data['logo_y']
            if 'logo_scale' in design_data:
                metadata.logo_scale = design_data['logo_scale']
            
            # New - Update logo properties if they exist in the design_data
            if 'logo_path' in design_data:
                logo_path = design_data['logo_path']
                # Only prepend S3 domain if it's a relative path
                if logo_path and not logo_path.startswith('http'):
                    metadata.logo_path = "https://autobgpro-bkt.s3.amazonaws.com" + logo_path
                else:
                    metadata.logo_path = logo_path

            # Update background path if it exists in design_data
            #if 'background_path' in design_data: metadata.background_path = design_data['background_path']
            
            # Update background path ONLY if it exists in design_data AND is not empty
            if 'background_path' in design_data and design_data['background_path']:
                metadata.background_path = design_data['background_path']
                
            metadata.save()

    return JsonResponse({'message': 'Design elements saved successfully!'}, status=201)

#new version
@csrf_exempt
@login_required
def upload_logo(request):
    if request.method == 'POST':
        try:
            user_id = str(request.user.id)
            logo_file = request.FILES.get('logo')
            project_id = request.POST.get('project_id')

            # Handle logo reset case
            if not logo_file:
                selected_pictures_json = request.POST.get('selectedPictures')
                selected_pictures = json.loads(selected_pictures_json) if selected_pictures_json else []
                if selected_pictures:
                    for pic in selected_pictures:
                        print("-----------------  selected_pictures for picture:", pic)
                        metadata = Metadata.objects.filter(project__id=project_id, image_path=pic) #.first()
                        if metadata:
                            metadata.logo_path = None  # Clear the logo path
                            metadata.save()
                
                return JsonResponse({
                    'status': 'success',
                    'message': 'Logo cleared successfully',
                    'logo_path': None
                })
            
            
            import boto3
            from botocore.exceptions import ClientError
            
            s3 = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            # Count existing logos in S3
            logo_prefix = f"media/user_upload/user_id_{user_id}/logos/"
            try:
                response = s3.list_objects_v2(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Prefix=logo_prefix,
                    MaxKeys=21  # We only need to check if we have 20+
                )
                current_count = len(response.get('Contents', []))
                
                # Enforce 20-logo limit
                if current_count >= 20:
                    return JsonResponse({
                        'error': 'You have 20 logo images saved. Please delete old logos to upload more.',
                        'limit_reached': True
                    }, status=400)
            except ClientError as e:
                # If the prefix doesn't exist yet, count is 0
                if e.response['Error']['Code'] == 'NoSuchKey':
                    current_count = 0
                else:
                    raise e
            

            # Generate a unique filename
            timestamp = int(time.time())
            file_extension = os.path.splitext(logo_file.name)[1].lower()
            logo_filename = f'logo_{timestamp}{file_extension}'
            
            
            # Upload to S3
            s3_logo_path = f"media/user_upload/user_id_{user_id}/logos/{logo_filename}"
            
            s3 = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            # Upload the file
            s3.upload_fileobj(
                logo_file,
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_logo_path,
                ExtraArgs={
                    'ContentType': logo_file.content_type,
                    'ACL': 'private'  # Make the file private
                }
            )
            
            # Generate a presigned URL for temporary access
            logo_url = s3.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': s3_logo_path
                },
                ExpiresIn=3600  #URL expires in 1 hour
            )
            
            relative_path = s3_logo_path
                
            
            
            # Update metadata for selected pictures PRODUCTION
            selected_pictures_json = request.POST.get('selectedPictures')
            selected_pictures = json.loads(selected_pictures_json) if selected_pictures_json else []
            
            if selected_pictures:
                cleaned_pictures = [pic.lstrip('/') for pic in selected_pictures]  # remove leading '/'

                for pic in cleaned_pictures: # selected_pictures:
                    print("-----------------  selected_pictures for picture:", pic)
                    # Get the project instance
                    project = Uploaded_Pictures.objects.get(id=project_id)
                    
                    # Get or create metadata for this project and image path
                    metadata, created = Metadata.objects.get_or_create(
                        project=project,
                        image_path=pic,
                        defaults={
                            'logo_path': "https://autobgpro-bkt.s3.amazonaws.com/"+relative_path,
                        }
                    )
                    
                    if not created:
                        # Update existing metadata
                        metadata.logo_path = "https://autobgpro-bkt.s3.amazonaws.com/"+relative_path
                        metadata.save()

            return JsonResponse({
                'status': 'success',
                'logo_path': relative_path,
                'logo_url': logo_url if settings.ENVIRONMENT == 'production' else None
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)


@csrf_exempt
@login_required
def get_logo_url(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            logo_path = data.get('logo_path')
            
            if settings.ENVIRONMENT == 'production' and logo_path:
                import boto3
                
                s3 = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_S3_REGION_NAME
                )
                
                # Generate a new presigned URL
                logo_url = s3.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                        'Key': logo_path
                    },
                    ExpiresIn=3600  # 1 hour
                )
                
                return JsonResponse({'url': logo_url})
            
            return JsonResponse({'error': 'Not in production mode or no logo path'}, status=400)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)

# Old version
#Save logo png file in folder
# @csrf_exempt
# @login_required
# def upload_logo(request):
#     if request.method == 'POST':
#         try:
#             user_id = str(request.user.id)
#             logo_file = request.FILES.get('logo')
#             project_id = request.POST.get('project_id')

#             # Handle logo reset case
#             if not logo_file:
#                 selected_pictures_json = request.POST.get('selectedPictures')
#                 selected_pictures = json.loads(selected_pictures_json) if selected_pictures_json else []
#                 if selected_pictures:
#                     for pic in selected_pictures:
#                         metadata = Metadata.objects.filter(project__id=project_id, image_path=pic).first()
#                         if metadata:
#                             metadata.logo_path = None  # Clear the logo path
#                             metadata.save()
                
#                 return JsonResponse({
#                     'status': 'success',
#                     'message': 'Logo cleared successfully',
#                     'logo_path': None
#                 })
            
#             # S3 STORAGE IMPLEMENTATION
#             from django.core.files.storage import default_storage
            
#             # S3 path where logos will be stored
#             # Format: user_upload/user_id_{user_id}/logos/
#             s3_logos_prefix =  f"user_upload/user_id_{user_id}/logos/"
            
            
#             # Check current number of logos in S3
#             current_count = 0
#             try:
#                 # List existing logo files in S3
#                 subdirs, files = default_storage.listdir(s3_logos_prefix)
#                 current_count = len([f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
#             except FileNotFoundError:
#                 # Directory doesn't exist yet, so count is 0
#                 current_count = 0
#             except Exception as e:
#                 print(f"Error counting existing logos: {str(e)}")
#                 current_count = 0
            
#             # Enforce 20-logo limit
#             if current_count >= 20:
#                 return JsonResponse({
#                     'error': 'You have 20 logo images saved. Please delete old logos to upload more.',
#                     'limit_reached': True
#                 }, status=400)
            
#             # Generate a unique filename
#             timestamp = int(time.time())
#             file_ext = os.path.splitext(logo_file.name)[1]
#             logo_filename = f'logo_{timestamp}{file_ext}'
            
#             # Full S3 key (path) for the new logo
#             s3_key = f"{s3_logos_prefix}{logo_filename}"
            
#             # Save the file to S3
#             default_storage.save(s3_key, logo_file)
#             print(f"Logo saved to S3: {s3_key}")
            
#             # Get the public URL for the S3 object
#             logo_url = default_storage.url(s3_key)
            
#             # For database storage, we can use either:
#             # Store the S3 key (recommended - consistent across environments)
#             db_logo_path = s3_key  # "user_upload/user_id_1/logos/logo_1234567890.png"
            
#             # Update metadata for selected pictures
#             selected_pictures_json = request.POST.get('selectedPictures')
#             selected_pictures = json.loads(selected_pictures_json) if selected_pictures_json else []
            
#             if selected_pictures:
#                 print("-------------------------")
#                 print("---------------->Selected pictures----------->:", selected_pictures)
#                 print("logo path to save in DB:", db_logo_path)
#                 print("logo URL to return to frontend:", logo_url)
#                 print("-------------------------")

#                 for pic in selected_pictures:
#                     selected_canvas = Metadata.objects.filter(project__id=project_id, image_path=pic).first()
                    
#                     if selected_canvas:
#                         # Get or create metadata for this project
#                         metadata, created = Metadata.objects.get_or_create(
#                             project=selected_canvas.project,
#                             image_path=pic,
#                             defaults={
#                                 'logo_path': logo_url,  # Use S3 key or URL
#                                 # 'logo_x': 100,
#                                 # 'logo_y': 100, 
#                                 # 'logo_scale': 0.1
#                             }
#                         )
                    
#                         if not created:
#                             # Update existing metadata
#                             metadata.logo_path = logo_url  # Use S3 key or URL
#                             metadata.save()

#             return JsonResponse({
#                 'status': 'success',
#                 'logo_path': logo_url,  # Return URL for frontend display
#                 's3_key': s3_key,      # Return S3 key for database/reference
#                 'filename': logo_filename
#             })
            
#         except Exception as e:
#             print(f"Error uploading logo: {str(e)}")
#             import traceback
#             traceback.print_exc()
#             return JsonResponse({'error': str(e)}, status=500)
    
#     return JsonResponse({'error': 'Invalid request method'}, status=400)




@csrf_exempt  # Use CSRF token in frontend for security
@login_required
def get_metadata(request, project_id):
    try:
        metadata = list(Metadata.objects.filter(project_id=project_id).values())  # Convert to list immediately
        return JsonResponse(metadata, safe=False)  # Return the list directly
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)



@csrf_exempt
@login_required
def design_template(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            if 'designMetadata' in data:
                # Extract data from the request
                design_metadata = data['designMetadata']
                project_id = data.get('project_id')
                template_name = data.get('template_name')
                logo_path = data.get('logo_path')
                print("logo_path in design_template:", logo_path)
                
                # Get the project (Uploaded_Pictures instance)
                project = get_object_or_404(Uploaded_Pictures, id=project_id, author=request.user)
                
                print("include_background: ",design_metadata.get("include_background"))
                print("project id: ", project_id)
                
                # Strip S3 domain prefix if present
                if logo_path and logo_path.startswith("https://autobgpro-bkt.s3.amazonaws.com"):
                    logo_path = logo_path.replace("https://autobgpro-bkt.s3.amazonaws.com", "")

                # Create a new Template instance
                template = Template(
                    author=request.user,
                    template_name=template_name,
                    background_path=project.background_image if design_metadata.get('include_background', True) else None,
                    
                    # Header settings
                    header_height=design_metadata.get('header', {}).get('height', 0),
                    header_color=design_metadata.get('header', {}).get('color', '#000000'),
                    header_opacity=design_metadata.get('header', {}).get('opacity', 1.0),
                    
                    # Footer settings
                    footer_height=design_metadata.get('footer', {}).get('height', 0),
                    footer_color=design_metadata.get('footer', {}).get('color', '#000000'),
                    footer_opacity=design_metadata.get('footer', {}).get('opacity', 1.0),
                    
                    # Logo settings
                    logo_path=logo_path,
                    logo_x=design_metadata.get('logo', {}).get('x', 100),
                    logo_y=design_metadata.get('logo', {}).get('y', 100),
                    logo_scale=design_metadata.get('logo', {}).get('scale', 1.0),
                    
                    
                        
                    # Texts
                    texts=design_metadata.get('footer', {}).get('texts', []),
                )

           
                
                # Save the template to database
                template.save()
                
                return JsonResponse({
                    'status': 'success',
                    'message': 'Template saved successfully',
                    'template_id': template.id
                })
            else:
                return JsonResponse({'error': 'Invalid data format: designMetadata missing'}, status=400)
                
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)


@csrf_exempt
@login_required
def get_templates(request):
    try:
        templates = Template.objects.filter(author=request.user).values('id', 'template_name')
        return JsonResponse({
            'templates': [{'id': t['id'], 'name': t['template_name']} for t in templates]
        }, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@login_required
def get_template_metadata(request, template_id):
    try:
        template = Template.objects.get(id=template_id, author=request.user)
        return JsonResponse({
            'header_height': template.header_height,
            'header_color': template.header_color,
            'header_opacity': template.header_opacity,
            'footer_height': template.footer_height,
            'footer_color': template.footer_color,
            'footer_opacity': template.footer_opacity,
            'texts': template.texts or [],
            'logo_path': template.logo_path or '',
            'logo_x': template.logo_x,
            'logo_y': template.logo_y,
            'logo_scale': template.logo_scale,
            'background_path': template.background_path or ''  # Add this line
        }, status=200)
    except Template.DoesNotExist:
        return JsonResponse({'error': 'Template not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@login_required
def delete_template(request, template_id):
    if request.method == 'POST':
        try:
            template = get_object_or_404(Template, id=template_id, author=request.user)
            template.delete()
            return JsonResponse({'status': 'success'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

# to show available logos - from saved logo dropdown button
@csrf_exempt
@login_required
def get_available_logos(request):
    try:
        user_id = request.user.id
        
        # S3 path where user logos are stored
        # Format: user_upload/user_id_{user_id}/logos/
        s3_logos_prefix = f"user_upload/user_id_{user_id}/logos/"
        
        logos = []
        
        try:
            # Use Django's storage backend (works for both local and S3)
            from django.core.files.storage import default_storage
            
            # List files in the S3 directory
            # default_storage.listdir() returns (subdirectories, files)
            subdirs, files = default_storage.listdir(s3_logos_prefix)
            
            print(f"Found {len(files)} files in S3 logos directory: {s3_logos_prefix}")
            
            # Filter for image files
            for filename in files:
                if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                    # Construct the full S3 key for this file
                    s3_key = f"{s3_logos_prefix}{filename}"
                    
                    # Get the public URL for the S3 object
                    # default_storage.url() generates a pre-signed URL
                    logo_url = default_storage.url(s3_key)
                    
                    logos.append({
                        'url': logo_url,           # URL for frontend display
                        'path': s3_key,            # S3 key for backend operations (deletion, etc.)
                        'filename': filename       # Original filename
                    })
                    
                    print(f"Added logo: {filename} -> {logo_url}")
                    
        except FileNotFoundError:
            # Directory doesn't exist yet (no logos uploaded)
            print(f"No logos found in S3: {s3_logos_prefix}")
        except Exception as e:
            print(f"Error accessing S3 logos: {str(e)}")
            # You might want to return an error here or just empty list
        
        return JsonResponse({'logos': logos})
    
    except Exception as e:
        print(f"Unexpected error in get_available_logos: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)
    

from django.views.decorators.csrf import ensure_csrf_cookie

@ensure_csrf_cookie
@require_POST
@login_required
def delete_logo(request):
    try:
        # Get the logo path from the request
        # This could be either a local path or S3 key, depending on what was stored
        logo_path = request.POST.get('logo_path')
        
        if not logo_path:
            return JsonResponse({'success': False, 'error': 'No logo path provided'}, status=400)
        
        user_id = str(request.user.id)
        
        # The logo_path could be in different formats depending on what was stored:
        # 1. Full S3 key: "user_upload/user_id_1/logos/logo_1234567890.png"
        # 2. Relative path: "media/user_upload/user_id_1/logos/logo_1234567890.png"
        # 3. Full URL: "https://bucket.s3.amazonaws.com/user_upload/user_id_1/logos/logo_1234567890.png"
        
        # Extract the S3 key from whatever format we have
        s3_key = None
        
        if logo_path.startswith('http'):
            # Case 3: Full URL - extract the S3 key
            # URL format: https://bucket.s3.region.amazonaws.com/user_upload/user_id_1/logos/filename.png
            if settings.AWS_S3_CUSTOM_DOMAIN in logo_path:
                s3_key = logo_path.replace(f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/", "")
            else:
                # Fallback: try to extract from any S3 URL
                from urllib.parse import urlparse
                parsed = urlparse(logo_path)
                s3_key = parsed.path.lstrip('/')
        
        elif logo_path.startswith('media/'):
            # Case 2: Relative path with media/ prefix
            s3_key = logo_path.replace('media/', '')
        
        else:
            # Case 1: Assume it's already an S3 key
            s3_key = logo_path
        
        # Security check: Ensure the logo belongs to the current user
        expected_prefix = f"user_upload/user_id_{user_id}/logos/"
        if not s3_key.startswith(expected_prefix):
            return JsonResponse({
                'success': False, 
                'error': 'Invalid logo path - does not belong to user'
            }, status=400)
        
        # Delete from S3
        from django.core.files.storage import default_storage
        
        if default_storage.exists(s3_key):
            default_storage.delete(s3_key)
            print(f"Deleted logo from S3: {s3_key}")
            return JsonResponse({
                'success': True, 
                'message': 'Logo deleted from S3',
                'deleted_key': s3_key
            })
        else:
            return JsonResponse({
                'success': False, 
                'error': 'Logo not found in S3 storage'
            }, status=404)
                
    except Exception as e:
        print(f"Error deleting logo: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': str(e)}, status=500) 






@login_required
def recent_projects(request):
    # Get user's projects ordered by creation date
    projects = Uploaded_Pictures.objects.filter(author=request.user).order_by('-createdDate')
    
    # Pagination
    offset = int(request.GET.get('offset', 0))
    limit = int(request.GET.get('limit', 10))
    paginator = Paginator(projects, limit)
    page = (offset // limit) + 1
    page_projects = paginator.get_page(page)
    
    # Prepare project data
    project_data = []
    for project in page_projects:
        user_id = project.author.id
        project_id = project.id
        
        images = []
        
        if settings.ENVIRONMENT == 'production' and hasattr(settings, 'DEFAULT_FILE_STORAGE'):
            # PRODUCTION: S3 Storage
            s3_cropped_prefix = f"images/user_id_{user_id}/post_id_{project_id}/cropped/"
            
            try:
                from django.core.files.storage import default_storage
                
                # List files in the S3 directory
                subdirs, files = default_storage.listdir(s3_cropped_prefix)
                
                # Filter for image files and get first 5
                image_files = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
                
                # Sort files numerically (0.png, 1.png, 2.png, etc.)
                try:
                    image_files.sort(key=lambda x: int(os.path.splitext(x)[0]))
                except (ValueError, TypeError):
                    image_files.sort()  # Fallback sort
                
                # Get URLs for first 5 images
                for filename in image_files[:5]:
                    s3_key = f"{s3_cropped_prefix}{filename}"
                    image_url = default_storage.url(s3_key)
                    images.append(image_url)
                    
            except FileNotFoundError:
                # Directory doesn't exist yet (images still processing or no images)
                pass
            except Exception as e:
                print(f"Error accessing S3 for project {project_id}: {str(e)}")
                
        else:
            # DEVELOPMENT: Local Filesystem
            cropped_path = os.path.join(
                settings.MEDIA_ROOT, 
                'images', 
                f'user_id_{user_id}', 
                f'post_id_{project_id}', 
                'cropped'
            )
            
            if os.path.exists(cropped_path):
                for filename in sorted(os.listdir(cropped_path))[:5]:
                    if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                        file_path = os.path.join(
                            settings.MEDIA_URL, 
                            'images', 
                            f'user_id_{user_id}', 
                            f'post_id_{project_id}', 
                            'cropped', 
                            filename
                        )
                        images.append(file_path)
        
        project_data.append({
            'id': project.id,
            'createdDate': project.createdDate.strftime("%Y-%m-%d %H:%M:%S"),
            'images': images,  # Already limited to 5 images
            'image_count': len(images)  # Additional info
        })
    
    # AJAX request (JSON response)
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'projects': project_data,
            'has_more': page_projects.has_next(),
            'total_projects': paginator.count,
            'current_page': page,
            'offset': offset,
            'limit': limit
        })
    
    # Regular request (HTML response)
    return render(request, 'rembgApp/recentProject.html', {
        'recent_projects': project_data,
        'offset': offset,
        'limit': limit,
        'has_more': page_projects.has_next(),
        'total_projects': paginator.count
    })


# In views.py
@login_required
def get_project_images(request, project_id):
    try:
        # Verify the project belongs to the current user
        project = get_object_or_404(Uploaded_Pictures, id=project_id, author=request.user)
        user_id = request.user.id
        
        images = []
        
        # PRODUCTION: S3 Storage
        # S3 path where cropped images are stored
        s3_cropped_prefix = f"images/user_id_{user_id}/post_id_{project_id}/cropped/"
        
        try:
            from django.core.files.storage import default_storage
            
            # List files in the S3 directory
            subdirs, files = default_storage.listdir(s3_cropped_prefix)
            
            # Filter for image files and sort them numerically
            image_files = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
            
            # Sort files numerically (0.png, 1.png, 2.png, etc.)
            try:
                image_files.sort(key=lambda x: int(os.path.splitext(x)[0]))
            except (ValueError, TypeError):
                # Fallback: if filenames aren't numeric, use natural sort
                image_files.sort()
            
            # Generate URLs for each image
            for filename in image_files:
                s3_key = f"{s3_cropped_prefix}{filename}"
                image_url = default_storage.url(s3_key)
                images.append(image_url)
                
            print(f"Found {len(images)} images in S3: {s3_cropped_prefix}")
            
        except FileNotFoundError:
            # Directory doesn't exist yet (images still processing or no images)
            print(f"S3 directory not found: {s3_cropped_prefix}")
        except Exception as e:
            print(f"Error accessing S3 images: {str(e)}")
                
        
        # Return consistent JSON response
        return JsonResponse({
            'success': True,
            'images': images,
            'count': len(images),
            'project_id': project_id
        })
        
    except Uploaded_Pictures.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Project not found or access denied'
        }, status=404)
    except Exception as e:
        print(f"Unexpected error in get_project_images: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Internal server error'
        }, status=500)

