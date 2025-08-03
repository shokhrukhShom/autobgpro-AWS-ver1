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
from django.utils.timezone import make_aware


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
                "message": "Invalid username and/or password."
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
            
        if len(password) < 1:
            return render(request, "rembgApp/register.html", {
                "message": "Sorry, password must be at least 8 characters. Please, create longer password",
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
        
        
        
        
        now_utc = timezone.now()  
        current_period_start = now_utc.date()
        current_period_end = current_period_start + relativedelta(months=1)


        # Create profile with actual plan details
        UserProfile.objects.create(
            user=user,
            stripe_customer_id=session.customer,
            plan_type=plan_type,
            monthly_image_limit=1000 if plan_type == 'pro' else 500,
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
    
    # Set default reset date to next month if not set
    reset_date = profile.current_period_end
    if not reset_date:
        from datetime import datetime, timedelta
        reset_date = datetime.now() + timedelta(days=30)
    
    return JsonResponse({
        'used': profile.images_used_this_month,
        'limit': profile.monthly_image_limit,
        'reset_date': reset_date.strftime('%b %-d'),
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

#         # Check if the directory exists
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


# views.py
from datetime import datetime, timedelta
from django.utils import timezone
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from rembgApp.models import UserProfile

@csrf_exempt  # Temporarily disable CSRF for testing
@login_required
def test_renewal(request):
    try:
        now = datetime.now()
        test_data = {
            "id": "sub_1RrQyzCaEGsYhfdv8itJ11nW",
            "object": "subscription",
            "customer": "cus_Sn109L11STRr3n",
            "status": "active",
            "current_period_start": int((now - timedelta(days=30)).timestamp()),
            "current_period_end": int(now.timestamp()),
            "items": {
                "data": [{
                    "id": "si_test123",
                    "object": "subscription_item",
                    "price": {
                        "id": "price_1RqoTCCaEGsYhfdvPijlMlir",
                        "object": "price"
                    },
                    "quantity": 1
                }]
            }
        }

        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(
            stripe_customer_id="cus_Sn109L11STRr3n",
            defaults={
                "user": request.user,
                "plan_type": "starter",
                "monthly_image_limit": 500,
                "images_used_this_month": 300,
                "current_period_end": timezone.now() - timedelta(days=1)
            }
        )

        from .webhooks import handle_subscription_update
        handle_subscription_update(test_data)
        
        profile.refresh_from_db()
        return JsonResponse({
            "status": "success",
            "images_used": profile.images_used_this_month,
            "period_end": profile.current_period_end.strftime('%Y-%m-%d')
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
    
    
    
# END Test-----------------

@csrf_exempt
@login_required
def uploadImg(request):
    
    # if request get display uploadImg.html
    if request.method == "GET":
        return render(request, "rembgApp/uploadImg.html")
    

            
# Get and Post rmbg.html page   
@csrf_exempt
@login_required
def rmbg(request):
    # getting latest post_id by current user
    latest_upload = Uploaded_Pictures.objects.filter(author = request.user).order_by('-id').first()
    
    user_id = str(request.user.id) # Get the current user
    
    # if user has not uploaded images yet
    if latest_upload:
        latest_upload_id = latest_upload.id
    else:
        bg_img_paths = []
        # bg_img_templates_path = "media/bg-templates/"
        bg_img_templates_path = settings.BG_TEMPLATES_ROOT+"/default"
        
        for filename in os.listdir(bg_img_templates_path):
            if filename.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                # file_path = os.path.join(bg_img_templates_path, filename)
                # bg_img_paths.append(file_path)
                file_path = f"{settings.MEDIA_URL}bg-templates/default/{filename}"
                bg_img_paths.append(file_path)
        
        # Garage Folder BG
        bg_img_paths_garage = []
        bg_img_templates_path_garage = settings.BG_TEMPLATES_ROOT+"/garage"        
        for filename in os.listdir(bg_img_templates_path_garage):
            if filename.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                # file_path = os.path.join(bg_img_templates_path, filename)
                # bg_img_paths.append(file_path)
                file_path = f"{settings.MEDIA_URL}bg-templates/garage/{filename}"
                bg_img_paths_garage.append(file_path)
        
        # Road Folder BG        
        bg_img_paths_road = []
        bg_img_templates_path_road = settings.BG_TEMPLATES_ROOT+"/road"        
        for filename in os.listdir(bg_img_templates_path_road):
            if filename.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                # file_path = os.path.join(bg_img_templates_path, filename)
                # bg_img_paths.append(file_path)
                file_path = f"{settings.MEDIA_URL}bg-templates/road/{filename}"
                bg_img_paths_road.append(file_path)        
        
        context = {
            
            # 'sorted_rembg_files_path': sorted_rembg_files_path,
            "bg_img_paths" : bg_img_paths,
            "bg_img_paths_garage": bg_img_paths_garage,
            "bg_img_paths_road": bg_img_paths_road,
            }
        return render(request, "rembgApp/rmbg.html", context)


    if request.method == "GET":

        # Current background image--------------
        picture = get_object_or_404(Uploaded_Pictures, id=latest_upload_id)
        current_bg = picture.background_image
        
        # PNG images ----------Start-----------
        path_rembg = "media/images/"+"user_id_" + user_id + "/" + "post_id_" + str(latest_upload_id) + "/cropped"
        
        
        rembg_files_path = []
        
        # Loop through the images in the folder and save it to image_files_path list
        for filename in os.listdir(path_rembg):
            if filename.endswith(('.png')):
                file_path = os.path.join(path_rembg, filename)
                rembg_files_path.append(file_path)
                
        
        # Sort by the numeric part of the filenames (code from chatgpt)
        sorted_rembg_files_path = sorted(rembg_files_path, key=lambda x: int(os.path.splitext(os.path.basename(x))[0]))
        #PNG images ------Finish--------

        #Loop through Background Image Folder (media/bg-templates)
        bg_img_paths = []
        # bg_img_templates_path = "media/bg-templates/"
        bg_img_templates_path = settings.BG_TEMPLATES_ROOT+"/default"
        
        for filename in os.listdir(bg_img_templates_path):
            if filename.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                # file_path = os.path.join(bg_img_templates_path, filename)
                # bg_img_paths.append(file_path)
                file_path = f"{settings.MEDIA_URL}bg-templates/default/{filename}"
                bg_img_paths.append(file_path)
        
        # Garage Folder BG
        bg_img_paths_garage = []
        bg_img_templates_path_garage = settings.BG_TEMPLATES_ROOT+"/garage"        
        for filename in os.listdir(bg_img_templates_path_garage):
            if filename.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                # file_path = os.path.join(bg_img_templates_path, filename)
                # bg_img_paths.append(file_path)
                file_path = f"{settings.MEDIA_URL}bg-templates/garage/{filename}"
                bg_img_paths_garage.append(file_path)
        
        # Road Folder BG        
        bg_img_paths_road = []
        bg_img_templates_path_road = settings.BG_TEMPLATES_ROOT+"/road"        
        for filename in os.listdir(bg_img_templates_path_road):
            if filename.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                # file_path = os.path.join(bg_img_templates_path, filename)
                # bg_img_paths.append(file_path)
                file_path = f"{settings.MEDIA_URL}bg-templates/road/{filename}"
                bg_img_paths_road.append(file_path)   
                
                
        # User uploaded background
        bg_img_paths_user = []
        bg_img_templates_path_user = os.path.join(settings.MEDIA_ROOT, "images", f"user_id_{user_id}", "user_backgrounds")
        # Create the folder if it doesn't exist
        os.makedirs(bg_img_templates_path_user, exist_ok=True)     
        for filename in os.listdir(bg_img_templates_path_user):
            if filename.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                # file_path = os.path.join(bg_img_templates_path, filename)
                # bg_img_paths.append(file_path)
                file_path = f"{settings.MEDIA_URL}/images/user_id_{user_id}/user_backgrounds/{filename}"
                bg_img_paths_user.append(file_path)                
        
        context = {
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
        
        print("_____Post request processing_______")
        data = json.loads(request.body)
        background_path = data.get('text')
        print("Data recieved: " + background_path + "_________")

        #save background picture name to DB
        # Get the specific Uploaded_Pictures instance using `id`
        uploaded_picture = get_object_or_404(Uploaded_Pictures, id=latest_upload_id)
        uploaded_picture.background_image = background_path
        uploaded_picture.save()
        
        return redirect("rmbg")



@csrf_exempt  # Optional if you handle CSRF token manually in JS
@login_required
def upload_background(request):
    if request.method == 'POST' and request.FILES.get('image'):
        
        user_id = str(request.user.id)
        uploaded_file = request.FILES['image']
        
        # Create a unique filename using uuid to avoid overwriting
        file_ext = os.path.splitext(uploaded_file.name)[1]
        file_name = f"{uuid.uuid4().hex}{file_ext}"
        
        # Define upload path: media/images/user_id_X/user_backgrounds/
        upload_path = os.path.join(settings.MEDIA_ROOT, 'images', f'user_id_{user_id}','user_backgrounds')
        os.makedirs(upload_path, exist_ok=True)

        file_path = os.path.join(upload_path, file_name)
        
        # Save uploaded image to disk
        with open(file_path, 'wb+') as f:
            for chunk in uploaded_file.chunks():
                f.write(chunk)
                
        # Return image URL so frontend can display it
        file_url = f"{settings.MEDIA_URL}images/user_id_{user_id}/user_backgrounds/{file_name}"
        return JsonResponse({'url': file_url})

    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required
def background_upload_page(request):
    user_id = request.user.id
    user_folder = os.path.join(settings.MEDIA_ROOT, 'images', f'user_id_{user_id}', 'user_backgrounds')

    bg_paths = []
    if os.path.exists(user_folder):
        for file in os.listdir(user_folder):
            url_path = f"{settings.MEDIA_URL}images/user_id_{user_id}/user_backgrounds/{file}"
            bg_paths.append(url_path)

    return render(request, 'upload_background.html', {
        'user_backgrounds': bg_paths
    })

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
            
            # Build the full file path securely
            user_folder = os.path.join(
                settings.MEDIA_ROOT,
                'images',
                f'user_id_{user_id}',
                'user_backgrounds'
            )
            
            # Protect against path traversal
            safe_path = os.path.normpath(os.path.join(user_folder, filename))
            if not safe_path.startswith(user_folder):
                return JsonResponse({'error': 'Invalid file path'}, status=400)

            if os.path.exists(safe_path):
                os.remove(safe_path)
                return JsonResponse({'success': True})
            else:
                return JsonResponse({'error': 'File does not exist'}, status=404)
                
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)

 
    
# Saving images from uploadImg.html
@csrf_exempt
@login_required
def imageProcessing(request): #API Processing
    if request.method == "POST":
        
        # First check usage limits before processing # New code
        profile = request.user.userprofile
        files_count = len(request.FILES.getlist('images'))
        
        if profile.images_used_this_month + files_count > profile.monthly_image_limit:
            return JsonResponse({
                "error": f"You've reached your monthly limit of {profile.monthly_image_limit} images. Upgrade your plan or wait until next month."
            }, status=403)
        
        # End New code  
            
        user_id = str(request.user.id) # save user id in user_id variable
        images = request.FILES.getlist('images')  # 'images' should match the key in FormData
        
        if not images:
            print("No files received.")  # This message should help diagnose the issue
            return JsonResponse({"Error": "No image in the list"}, status=200) # If no files received
        else:
            print("Received files:")
            for image in images:
                print(f"File name: {image.name}, File size: {image.size} bytes")
    

         # Getting latest post_id to create inside the folder of the user
        try:
            queryset = Uploaded_Pictures.objects.latest('id') #get the latest post id and assign it to queryset
            # make sure it is current user <---
            
            folder_inside_user_id = queryset.id # Assign the id to folder_inside_user_id
            folder_inside_user_id = int(folder_inside_user_id) + 1 # convert to integer add 1 and assign/update variable folder_inside_user_id

        # if db of user is empty, create first folder. if Uploaded_Pictures (is models.py post_id) empty create first post folder 0   
        except Uploaded_Pictures.DoesNotExist:
            folder_inside_user_id = 0
            

        # Creating directory for uploaded pictures
        # path_save_uploaded_picture = "/home/sh/Desktop/django-rembg-3v/rembg_w_python/media/images/user_id_" + user_id + "/" + "post_id_" + str(folder_inside_user_id) + "/initialUpload/"
        path_save_uploaded_picture = os.path.join(
            settings.IMAGE_UPLOAD_ROOT,
            f"user_id_{user_id}",
            f"post_id_{folder_inside_user_id}",
            "initialUpload"
        )
        
        # Check if the directory exists
        if not os.path.exists(path_save_uploaded_picture):
            # If the directory doesn't exist, create it
            os.makedirs(path_save_uploaded_picture)

        
        
        counter = 0
        image_names = ""

        for image in images:

            
            print(str(counter) + " : " + f"{image}")
           
            # renaming and saving original pictures
            with open(path_save_uploaded_picture +"/"+ str(counter)+".jpg", 'wb+') as destination:
                image_names = image_names + str(counter)+ ".jpg "
                counter = int(counter) + 1  
                for chunk in image.chunks():
                    destination.write(chunk)

       
        # pushing image_names string to sqlite3 database
        current_user = request.user
        
        instance = Uploaded_Pictures()
        instance.author = current_user
        instance.images_text = image_names
        instance.rmbg_picture = image_names
        
        instance.save()
        images = ""
            
        #------------under this line rembg library  codes --------------

        # Create directory for bg removed pictures
        # path_save_processed_rembg = "/home/sh/Desktop/django-rembg-3v/rembg_w_python/media/images/"+"user_id_" + user_id + "/" + "post_id_" + str(folder_inside_user_id) + "/rembg"
        path_save_processed_rembg = os.path.join(
            settings.IMAGE_UPLOAD_ROOT,
            f"user_id_{user_id}",
            f"post_id_{folder_inside_user_id}",
            "rembg"
        )
        
        # Check if the directory exists
        if not os.path.exists(path_save_processed_rembg):
            # If the directory doesn't exist, create it
            os.makedirs(path_save_processed_rembg)
            
        
        # Empty List to hold the image paths
        image_files_path = []
        
        # Loop through the images in the folder and save it to image_files_path list
        for filename in os.listdir(path_save_uploaded_picture):
            if filename.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                file_path = os.path.join(path_save_uploaded_picture, filename)
                image_files_path.append(file_path)
                #print(file_path)
        

        #sorting image_files_path 0.png, 1.png, 2.png etc
        # Sort by the numeric part of the filenames (code from chatgpt)
        sorted_image_files_path = sorted(image_files_path, key=lambda x: int(os.path.splitext(os.path.basename(x))[0]))

                        
        # Counter to name the image (e.g. 0, 1, 2, etc)
        counter_rembg = 0
        # Loop the each path and remove background
        for img_path in sorted_image_files_path:
            print(" file path: " + img_path)
            input_image = Image.open(img_path) # open img PIL
            output_image = remove(input_image) #removing bg with rembg library
            output_image.save(path_save_processed_rembg + "/" + str(counter_rembg) + ".png") # Path to save the img inside rembg folder
            counter_rembg = int(counter_rembg) + 1 # updating image name by adding one
        
        # Cropping png section ---------

        # Create a path
        # path_save_cropped_rembg = "/home/sh/Desktop/django-rembg-3v/rembg_w_python/media/images/"+"user_id_" + user_id + "/" + "post_id_" + str(folder_inside_user_id) + "/cropped"
        path_save_cropped_rembg = os.path.join(
            settings.IMAGE_UPLOAD_ROOT,
            f"user_id_{user_id}",
            f"post_id_{folder_inside_user_id}",
            "cropped"
        )
        
        
        # Check if the directory exists
        if not os.path.exists(path_save_cropped_rembg):
            # If the directory doesn't exist, create it
            os.makedirs(path_save_cropped_rembg)
            
        

         # Loop through the rembg png images in the folder and save it to path_save_cropped_rembg list
        for filename in os.listdir(path_save_processed_rembg):
            if filename.endswith(('.png')):
                file_path = os.path.join(path_save_processed_rembg, filename)
                
                # Open the PNG file
                img = Image.open(file_path)
                # Get the bounding box of the non-transparent areas
                bbox = img.getbbox()

                # Crop the image to the bounding box
                cropped_img = img.crop(bbox)

                # Save the cropped image
                cropped_path_name = os.path.join(path_save_cropped_rembg, filename)
                cropped_img.save(cropped_path_name)
                

        

        print("_______SUCCESS__________")
        
        
        print("Current number of images: ", counter)
        # New CODE for tracking
        # After successful processing, track the usage
        try:
            profile.images_used_this_month += counter
            profile.save()
        except Exception as e:
            print(f"Error tracking image usage: {str(e)}")
            # Don't fail the request, just log the error
        # end NEw
        
          

        return JsonResponse({"Backend message": "image added",
                             "redirect_url": "/rmbg" # this is url it will redirect 
                             }, status=201)
       


@csrf_exempt
@login_required
# save_image_edit from canvas image edit "save" button clicked
def save_image_edit(request):
    if request.method == "POST":
        try:
            # Parse the JSON data from the request body
            data = json.loads(request.body)
            image_data = data.get("image")
            image_path = data.get("image_path", "")

            # Strip out the 'data:image/png;base64,' part from the image data
            format, imgstr = image_data.split(';base64,')  
            #ext = format.split('/')[-1]  # Get the image extension (e.g., png, jpeg)

            # Convert the base64 string to binary data
            img_data = base64.b64decode(imgstr)

            with open (image_path, 'wb') as f:
                f.write(img_data)
            
            # The regular expression r'post_id_(\d+)' looks for 
            # the pattern post_id_ followed by one or more digits
            #use Python's re module 
            match = re.search(r'post_id_(\d+)', image_path)
            if match:
                post_id = int(match.group(1))
                print(":) matched - post_id: ", post_id)
            else:
                print(post_id + " post_id not found :( ")
            
            # Finding Background image with post_id
            post = get_object_or_404(Uploaded_Pictures, author=request.user, id=post_id)
            # Access the background_image field
            background_image = post.background_image
            #print("--->This is background img path:" + background_image)



            # Creating new picture ------------->

            # getting the name of image, for example: 3.png
            file_name = os.path.basename(image_path)
            user_id = str(request.user.id) # Get the current user
    
            # Create output path
            output_path = "media/images/user_id_"+ user_id +"/post_id_"+ str(post_id) +"/output/"+file_name
            
            # Deleting old picture
            # Check if the file exists before attempting to delete it
            if os.path.exists(output_path):
                os.remove(output_path)
                print(f"{output_path} has been deleted.")
            else:
                print(f"{output_path} does not exist.")

            # Open the original PNG image
            original_img = Image.open(image_path).convert("RGBA")
            # Open the background image and resize it to match the size of the original image
            background_image = Image.open(background_image).convert("RGBA")
            background_image = background_image.resize(original_img.size)
            # Composite the original PNG onto the background image
            combined = Image.alpha_composite(background_image, original_img)

            # Save the result
            combined.convert("RGB").save(output_path)
            print(f"Saved with background at {output_path}")


            return JsonResponse({"status": "success", "file_path": "file_path"})

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)})
    else:
        return JsonResponse({"status": "error", "message": "Invalid request method"})



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
            
        # image_path = "http://127.0.0.1:8000"+image_path 
        image_path = settings.MEDIA_URL + image_path
        image_path = image_path.replace('media/', '').lstrip('/')
        
        design_data = element.get('design_data', {})
        print("image path: ",image_path)
        

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
                
                'logo_path': design_data.get('logo_path', "Not Given"),
                'logo_x': design_data.get('logo_x', 100),
                'logo_y': design_data.get('logo_y', 100),
                'logo_scale': design_data.get('logo_scale', 0.1) 
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
            if 'logo_path' in design_data:
                metadata.logo_path = design_data['logo_path']
            if 'logo_x' in design_data:
                metadata.logo_x = design_data['logo_x']
            if 'logo_y' in design_data:
                metadata.logo_y = design_data['logo_y']
            if 'logo_scale' in design_data:
                metadata.logo_scale = design_data['logo_scale']
            
            metadata.save()

    return JsonResponse({'message': 'Design elements saved successfully!'}, status=201)


#Save logo png file in folder
@csrf_exempt
@login_required
def upload_logo(request):
    if request.method == 'POST':
        try:
            user_id = str(request.user.id)
            logo_file = request.FILES.get('logo')
            project_id = request.POST.get('project_id')  # Get the project ID from the POST data

            # Handle logo reset case
            if not logo_file:
                selected_pictures_json = request.POST.get('selectedPictures')
                selected_pictures = json.loads(selected_pictures_json) if selected_pictures_json else []
                if selected_pictures:
                    for pic in selected_pictures:
                        metadata = Metadata.objects.filter(project__id=project_id, image_path=pic).first()
                        if metadata:
                            metadata.logo_path = None  # Clear the logo path
                            metadata.save()
                
                return JsonResponse({
                    'status': 'success',
                    'message': 'Logo cleared successfully',
                    'logo_path': None
                })
                
            # End of logo reset
       
            
            # Create logos directory if it doesn't exist
            logo_dir = os.path.join(settings.MEDIA_ROOT, 'images', f'user_id_{user_id}', 'logos')
            os.makedirs(logo_dir, exist_ok=True)
            
            # Generate a unique filename (you can customize this)
            timestamp = int(time.time())
            logo_filename = f'logo_{timestamp}{os.path.splitext(logo_file.name)[1]}'
            logo_path = os.path.join(logo_dir, logo_filename)
            
            # Save the file
            with open(logo_path, 'wb+') as destination:
                for chunk in logo_file.chunks():
                    destination.write(chunk)
            
            # Return the relative path that can be used in the frontend
            relative_path = os.path.join('media', 'images', f'user_id_{user_id}', 'logos', logo_filename)
            print(relative_path)
            
            
            # New code
            selected_pictures_json = request.POST.get('selectedPictures') # Get the JSON string from the POST data
            selected_pictures = json.loads(selected_pictures_json) if selected_pictures_json else []
            
            if selected_pictures:
                print("Selected pictures:", selected_pictures)
                
                for pic in selected_pictures:
                    # print("Picture from selected pictures array: ", pic)
                    selected_canvas = Metadata.objects.filter(project__id=project_id, image_path=pic).first()
                    print("Selected canvas: ", selected_canvas)

                    if selected_canvas:
                        # Get or create metadata for this project
                        metadata, created = Metadata.objects.get_or_create(
                            project=selected_canvas.project,
                            image_path=pic,
                            defaults={
                                'logo_path': relative_path,
                                # 'logo_x': 100,  # Default X position
                                # 'logo_y': 100,  # Default Y position
                                # 'logo_scale': 0.1  # Default scale
                            }
                    )
                    
                    if not created:
                        # Update existing metadata
                        # metadata.logo_path = 'http://127.0.0.1:8000/'+relative_path
                        # Update existing metadata with proper URL construction
                        # metadata.logo_path = request.build_absolute_uri('/')[:-1] + relative_path
                        # Alternative: If you want just the path without domain (recommended if you're using MEDIA_URL in templates)
                        metadata.logo_path = relative_path
                        metadata.save()

            # End new code

            return JsonResponse({
                'status': 'success',
                'logo_path': relative_path
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)


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
                
                # Get the project (Uploaded_Pictures instance)
                project = get_object_or_404(Uploaded_Pictures, id=project_id, author=request.user)
                
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
            'logo_scale': template.logo_scale
        }, status=200)
    except Template.DoesNotExist:
        return JsonResponse({'error': 'Template not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)