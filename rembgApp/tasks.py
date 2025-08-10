from celery import shared_task
from PIL import Image
from rembg import remove
import os

@shared_task
def process_images_task(user_id, post_id, path_initial_upload, path_rembg, path_cropped):
    """
    Background task to remove backgrounds and crop images.
    """
    # Ensure output folders exist
    os.makedirs(path_rembg, exist_ok=True)
    os.makedirs(path_cropped, exist_ok=True)

    # Sort files numerically
    sorted_files = sorted(
        os.listdir(path_initial_upload),
        key=lambda x: int(os.path.splitext(x)[0])
    )

    # Background removal
    for counter, filename in enumerate(sorted_files):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            img_path = os.path.join(path_initial_upload, filename)
            input_image = Image.open(img_path)
            output_image = remove(input_image)
            output_image.save(
                os.path.join(path_rembg, f"{counter}.png"),
                "PNG",
                optimize=False,
                compress_level=0
            )

    # Cropping
    for filename in os.listdir(path_rembg):
        if filename.lower().endswith('.png'):
            img_path = os.path.join(path_rembg, filename)
            img = Image.open(img_path)
            bbox = img.getbbox()
            if bbox:
                cropped_img = img.crop(bbox)
                cropped_img.save(os.path.join(path_cropped, filename))

    print(f"[Celery] Finished processing post {post_id} for user {user_id}")
