#!/bin/bash

# List the specific files you want to add
FILES=(
    "requirements.txt"
    "documentation.txt"
    "rembgApp/views.py"
    "rembgApp/urls.py"


    "rembgApp/templates/rembgApp/rmbg.html"
    "rembgApp/models.py"
    "rembgApp/static/rmbg.js"

    
    "rembgApp/static/main_preview/logo_properties.js"
    "rembgApp/static/main_preview/canvas_mouse.js"
    "rembgApp/static/main_preview/metadata_fetch.js"
    "rembgApp/static/main_preview/header.js"
    "rembgApp/static/main_preview/footer.js"
    "rembgApp/static/main_preview/download_zip.js"
    "rembgApp/static/main_preview/template.js"


)

# Loop through and add each file
for file in "${FILES[@]}"
do
    git add "$file"
done

echo "Selected files have been added to staging."


# 1.To make this script executable, run:
# chmod +x git_save_files.sh

# 2. then execute it with:
# ./git_save_files.sh

#. 3 Finally, commit the changes:
# you change message as needed or commit as-is
git commit -m "git_save_files.sh: changed the path to make production ready"