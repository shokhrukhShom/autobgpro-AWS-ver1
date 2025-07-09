from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect
#from .forms import UploadPictureForm
from django.urls import reverse
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt 
from .models import User, Uploaded_Pictures, Metadata
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



def custom_404_view(request, exception):
    return redirect('login')  # Assuming 'login' is the name of your login URL pattern


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("mainPage"))
        else:
            return render(request, "rembgApp/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "rembgApp/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("/"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "rembgApp/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "rembgApp/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("mainPage"))
    else:
        return render(request, "rembgApp/register.html")

def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("login"))



@login_required
def mainPage(request):
    if request.method == "GET":
        
        # Get the objects by -date by author = request.user aka current user
        queryset = Uploaded_Pictures.objects.filter(author = request.user).order_by('-createdDate')
        
        return render(request, 'rembgApp/mainPage.html', {'queryset' : queryset})
    
    if request.method == "POST":
        user_id = str(request.user.id)
        # Access the uploaded files directly from request.FILES
        images = request.FILES.getlist('image')
        
        print(images)
        
        if not images:
            print("no file uploaded")
            return render(request, 'rembgApp/mainPage.html', {
                "message": "You have not selected images, choose a files first then click upload"
            }) 
       
        # Getting latest post_id to create inside the folder of the user
        try:
            queryset = Uploaded_Pictures.objects.latest('id')
            folder_inside_user_id = queryset.id
            folder_inside_user_id = int(folder_inside_user_id) + 1
            
        except Uploaded_Pictures.DoesNotExist:
            folder_inside_user_id = 0
            

        # Creating directory for uploaded pictures
        path_save_uploaded_picture = "/home/sh/Desktop/django-rembg-2v/rembg_w_python/media/images/"+"user_id_" + user_id + "/" + "post_id_" + str(folder_inside_user_id)

        # Check if the directory exists
        if not os.path.exists(path_save_uploaded_picture):
            # If the directory doesn't exist, create it
            os.makedirs(path_save_uploaded_picture)
        
        counter = 0
        image_names = ""

        for image in images:

            
            print(str(counter) + " : " + f"{image}")
           
            
            with open(path_save_uploaded_picture +"/"+ str(counter)+".jpg", 'wb+') as destination:
                image_names = image_names + str(counter)+ ".jpg "
                counter = int(counter) + 1  
                for chunk in image.chunks():
                    destination.write(chunk)

        #print(image_names)
        
        # Converting/splittin text into array
        #image_array = image_names.split()
        #for img in image_array:
            #print(img)
        
        # pushing image_names string to sqlite3 database
        current_user = request.user
        
        instance = Uploaded_Pictures()
        instance.author = current_user
        instance.images_text = image_names
        
        instance.save()
        images = ""
            

        print("_______SUCCESS__________")
        
        return redirect('mainPage') 
        #return render(request, 'rembgApp/mainPage.html')
  
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
    latest_upload_id = latest_upload.id
    user_id = str(request.user.id) # Get the current user

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
        bg_img_templates_path = "media/bg-templates/"
        for filename in os.listdir(bg_img_templates_path):
            if filename.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                file_path = os.path.join(bg_img_templates_path, filename)
                bg_img_paths.append(file_path)

        context = {
            "latest_upload_id" : latest_upload_id,
            'current_bg' : current_bg,
            'sorted_rembg_files_path': sorted_rembg_files_path,
            "bg_img_paths" : bg_img_paths,

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



# Saving images from uploadImg.html
@csrf_exempt
@login_required
def imageProcessing(request): #API Processing
    if request.method == "POST":
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
        path_save_uploaded_picture = "/home/sh/Desktop/django-rembg-2v/rembg_w_python/media/images/user_id_" + user_id + "/" + "post_id_" + str(folder_inside_user_id) + "/initialUpload/"

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
        path_save_processed_rembg = "/home/sh/Desktop/django-rembg-2v/rembg_w_python/media/images/"+"user_id_" + user_id + "/" + "post_id_" + str(folder_inside_user_id) + "/rembg"
        
        
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
        path_save_cropped_rembg = "/home/sh/Desktop/django-rembg-2v/rembg_w_python/media/images/"+"user_id_" + user_id + "/" + "post_id_" + str(folder_inside_user_id) + "/cropped"
        
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
        image_path = "http://127.0.0.1:8000"+image_path 
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

            if not logo_file:
                return JsonResponse({'error': 'No logo file provided'}, status=400)
            
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
            
            
            # #new code
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
                        metadata.logo_path = relative_path
                        # metadata.logo_x = 100  # Reset position on new upload
                        # metadata.logo_y = 100
                        # metadata.logo_scale = 0.1
                        metadata.save()

            # #end new code
            
            
            # New code | save logo to sqlite -----------
            # Get the latest project for the current user
            # and get canvas by image path array list
            # latest_project = Uploaded_Pictures.objects.filter(author=request.user).order_by('-id').first()

            # if latest_project:
            #     # Get or create metadata for this project
            #     metadata, created = Metadata.objects.get_or_create(
            #         project=latest_project,
            #         defaults={
            #             'logo_path': relative_path,
            #             'logo_x': 100,  # Default X position
            #             'logo_y': 100,  # Default Y position
            #             'logo_scale': 0.1  # Default scale
            #         }
            #     )
                
            #     if not created:
            #         # Update existing metadata
            #         metadata.logo_path = relative_path
            #         metadata.logo_x = 100  # Reset position on new upload
            #         metadata.logo_y = 100
            #         metadata.logo_scale = 0.1
            #         metadata.save()
            # # END New code | save logo to sqlite -----------
            
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