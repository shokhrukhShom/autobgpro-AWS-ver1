from celery import shared_task
from PIL import Image
from rembg import remove
import os

# @shared_task
# def process_images_task(user_id, post_id, path_initial_upload, path_rembg, path_cropped):
#     """
#     Background task to remove backgrounds and crop images.
#     """
#     # Ensure output folders exist
#     os.makedirs(path_rembg, exist_ok=True)
#     os.makedirs(path_cropped, exist_ok=True)

#     # Sort files numerically
#     sorted_files = sorted(
#         os.listdir(path_initial_upload),
#         key=lambda x: int(os.path.splitext(x)[0])
#     )

#     # Background removal
#     for counter, filename in enumerate(sorted_files):
#         if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
#             img_path = os.path.join(path_initial_upload, filename)
#             input_image = Image.open(img_path)
#             output_image = remove(input_image)
#             output_image.save(
#                 os.path.join(path_rembg, f"{counter}.png"),
#                 "PNG",
#                 optimize=False,
#                 compress_level=0
#             )

#     # Cropping
#     for filename in os.listdir(path_rembg):
#         if filename.lower().endswith('.png'):
#             img_path = os.path.join(path_rembg, filename)
#             img = Image.open(img_path)
#             bbox = img.getbbox()
#             if bbox:
#                 cropped_img = img.crop(bbox)
#                 cropped_img.save(os.path.join(path_cropped, filename))

#     print(f"[Celery] Finished processing post {post_id} for user {user_id}")


from PIL import Image
import io
from django.core.files.storage import default_storage

# @shared_task
# def process_images_task(user_id, post_id, initial_upload_path, rembg_path, cropped_path):
#     # List files in initial upload folder on S3
#     initial_files = []
#     for filename in default_storage.listdir(initial_upload_path)[1]:
#         if filename.endswith('.jpg'):
#             initial_files.append(filename)
    
#     for filename in sorted(initial_files):
#         # Download from S3
#         initial_key = f"{initial_upload_path}/{filename}"
#         with default_storage.open(initial_key, 'rb') as f:
#             input_data = f.read()
        
#         # Process with rembg
#         output_data = remove(input_data)
        
#         # Save rembg version to S3
#         rembg_key = f"{rembg_path}/{filename.replace('.jpg', '.png')}"
#         with default_storage.open(rembg_key, 'wb') as f:
#             f.write(output_data)
        
#         # Process cropped version
#         img = Image.open(io.BytesIO(output_data))
#         bbox = img.getbbox()
        
#         if bbox:
#             cropped_img = img.crop(bbox)
#             buffer = io.BytesIO()
#             cropped_img.save(buffer, format='PNG')
#             buffer.seek(0)
            
#             # Save cropped version to S3
#             cropped_key = f"{cropped_path}/{filename.replace('.jpg', '.png')}"
#             with default_storage.open(cropped_key, 'wb') as f:
#                 f.write(buffer.getvalue())
#         else:
#             # If no bounding box, copy the rembg image
#             with default_storage.open(cropped_key, 'wb') as f:
#                 f.write(output_data)

@shared_task
def process_images_task(user_id, post_id, initial_upload_path, rembg_path, cropped_path):
    from django.core.files.storage import default_storage
    
    try:
        # List files in initial upload folder on S3
        initial_files = []
        try:
            # Check if the path exists and get files
            dirs, files = default_storage.listdir(initial_upload_path)
            for filename in files:
                if filename.lower().endswith('.jpg'):
                    initial_files.append(filename)
        except FileNotFoundError:
            print(f"Directory {initial_upload_path} not found in S3")
            return
        except Exception as e:
            print(f"Error listing S3 directory: {e}")
            return
        
        # Sort files numerically by their base name (0.jpg, 1.jpg, etc.)
        initial_files.sort(key=lambda x: int(os.path.splitext(x)[0]))
        
        print(f"Found {len(initial_files)} images to process: {initial_files}")
        
        for filename in initial_files:
            try:
                # Download from S3
                initial_key = f"{initial_upload_path}/{filename}"
                print(f"Processing: {initial_key}")
                
                with default_storage.open(initial_key, 'rb') as f:
                    input_data = f.read()
                
                # Process with rembg
                output_data = remove(input_data)
                
                # Save rembg version to S3
                rembg_filename = filename.replace('.jpg', '.png')
                rembg_key = f"{rembg_path}/{rembg_filename}"
                
                with default_storage.open(rembg_key, 'wb') as f:
                    f.write(output_data)
                
                print(f"Saved rembg: {rembg_key}")
                
                # Process cropped version
                img = Image.open(io.BytesIO(output_data))
                bbox = img.getbbox()
                
                if bbox:
                    cropped_img = img.crop(bbox)
                    buffer = io.BytesIO()
                    cropped_img.save(buffer, format='PNG')
                    buffer.seek(0)
                    
                    # Save cropped version to S3
                    cropped_key = f"{cropped_path}/{rembg_filename}"
                    with default_storage.open(cropped_key, 'wb') as f:
                        f.write(buffer.getvalue())
                    print(f"Saved cropped: {cropped_key}")
                else:
                    # If no bounding box, copy the rembg image
                    cropped_key = f"{cropped_path}/{rembg_filename}"
                    with default_storage.open(cropped_key, 'wb') as f:
                        f.write(output_data)
                    print(f"Copied rembg to cropped (no bbox): {cropped_key}")
                    
            except Exception as e:
                print(f"Error processing {filename}: {str(e)}")
                continue
        
        print(f"[Celery] Finished processing post {post_id} for user {user_id}")
        
    except Exception as e:
        print(f"Critical error in process_images_task: {str(e)}")
        import traceback
        traceback.print_exc()