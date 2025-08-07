#!/bin/bash

# Check if a commit message was provided
if [ -z "$1" ]; then
    echo "❌ Error: No commit message provided."
    echo "Usage: ./git_files.sh \"your commit message here\""
    exit 1
fi

# List the specific files you want to add
FILES=(
    "git_files.sh"
    "requirements.txt"
    "documentation.txt"
    
     #stripe
    "rembgApp/cron.py" # reset monthly count tokens
    "rembgApp/views.py"
    "rembgApp/urls.py"
    "rembgApp/models.py"
    "rembgApp/webhooks.py"


    # css
    "rembgApp/static/css/bg_insert.css"
    "rembgApp/static/css/canvas-selection.css"
    "rembgApp/static/css/canvasStyle.css"
    "rembgApp/static/css/uploadImg.css"
    "rembgApp/static/rmbg.js"
    "rembgApp/static/rmbg_function.js"

    
    "rembgApp/static/main_preview/logo_select.js"
    "rembgApp/static/main_preview/logo_properties.js"
    "rembgApp/static/main_preview/canvas_mouse.js"
    "rembgApp/static/main_preview/metadata_fetch.js"
    "rembgApp/static/main_preview/header.js"
    "rembgApp/static/main_preview/footer.js"
    "rembgApp/static/main_preview/download_zip.js"
    "rembgApp/static/main_preview/template.js"
    "rembgApp/static/handleImg.js"
    "rembgApp/static/recentProjects.js"

    "rembgApp/static/css/rmbg.css"
    "rembgApp/static/css/text_edit.css"


    # js 
    "rembgApp/static/canvas.js"
    "rembgApp/static/canvasJavascript.js"
    "rembgApp/static/jszip.js"
    "rembgApp/static/uploadImg.js"


    
     # Authorization / login - register files
    "rembgApp/templates/rembgApp/login.html"
    "rembgApp/templates/rembgApp/rmbg.html"
    "rembgApp/templates/rembgApp/landingFolder/landing_page.html"
    "rembgApp/templates/rembgApp/landingFolder/layout_landing.html"
    "rembgApp/templates/rembgApp/register.html"
    "rembgApp/templates/rembgApp/forgot_username.html"
    "rembgApp/templates/rembgApp/password_reset_complete.html"
    "rembgApp/templates/rembgApp/password_reset_done.html"
    "rembgApp/templates/rembgApp/password_reset.html"
    "rembgApp/templates/rembgApp/register_cancel.html"
    "rembgApp/templates/rembgApp/register_success.html"
    # html templates
    "rembgApp/templates/rembgApp/uploadImg.html"
    "rembgApp/templates/rembgApp/canvasPage.html"
    "rembgApp/templates/rembgApp/recentProject.html"

    


    # Migrations - coonsistent db record
    "rembgApp/migrations/*.py"

    # folder and imgs
    "rembgApp/static/images/"

    
)

# Loop through and add each file
for file in "${FILES[@]}"
do
    git add "$file"
done

echo "Selected files have been added to staging."


# 1.To make this script executable, run:
# chmod +x git_files.sh

# 2. then execute it with:
# ./git_files.sh

#. 3 Finally, commit the changes:
# you change message as needed or commit as-is
git commit -m "$1"