window.selectedPicture = null; // Variable to store the selected picture in "background insert" page  
window.selectedCanvas = null;


document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Loaded from rembg.js");

    // call all your functions here e.g.: myFunction();
    //Background_Insert;
    document.getElementById("Background_Insert").addEventListener("click", Background_Insert);
    Checkmark_picture();
    img_clicked();
    document.getElementById("backToMainBtn").addEventListener("click", backToMainBtn);
    updateImages(); // update image whenever page loads, can be bad practice but meh...
    toggleDropdown;
    saveImage;
    textBtn;
    setupTemplateCreation();
    delete_bg_image();
    accountDropdown();
    getUsage();

})


// when individual image clicked
//Edit_Image_Btn Button proccessed here too
function img_clicked() {

    const clickableImages = document.querySelectorAll(".clickable-image");
    const enlargedImageContainer = document.getElementById("enlarged-image-container");
    const enlargedImage = document.getElementById("enlarged-image");
    const closeButton = document.getElementById("close-button");
    const imageEditPage = document.getElementById("image-edit-page");
    const cancelBtn = document.getElementById("cancel");
    const Edit_Image_Btn = document.getElementById("Edit_Image_Btn");
    

    clickableImages.forEach((image) => {
        image.addEventListener("click", function() {
            // Set the source of the enlarged image to the clicked image's source
            enlargedImage.src = this.src;
            // Show the enlarged image container
            enlargedImageContainer.style.display = "flex"; // Use flex to center the content
            // Show the image edit toolbar
            imageEditPage.style.display = "block"; // Ensure the toolbar is visible
            
            // when Edit_Image_Btn clicked pass on the source of the image
            let imgSrc = enlargedImage.src;
            Edit_Image_Btn.addEventListener('click', function(){
                Edit_Image(imgSrc);
                //console.log(imgSrc);
                
            })
        });
    });

    // Close button functionality
    closeButton.addEventListener("click", function() {
        // Hide the enlarged image container
        enlargedImageContainer.style.display = "none";
        // Hide the image edit toolbar
        imageEditPage.style.display = "none"; // Hide the toolbar when closing the enlarged image
    });

    // cancelBtn button functionality
    cancelBtn.addEventListener("click", ()=> {
        // Hide the enlarged image container
        enlargedImageContainer.style.display = "none";
        // Hide the image edit toolbar
        imageEditPage.style.display = "none"; // Hide the toolbar when closing the enlarged image
    })

};

// background insert page
window.Background_Insert = function(){
    //console.log('bg insert clicked');
    // Getting Elements and assigning it to variable
    const div_rmbg_images = document.getElementById("rmbg_images");
    const div_bg_images = document.getElementById("bg_images");
    const div_tool_bar = document.getElementById("tool_bar");

    // Hiding div_rmbg_images when bg_intsert button clicked

    div_rmbg_images.style.display = "none"; // hide div_rmbg_images element
    div_bg_images.style.display ="block"; // show div_bg_images element
    div_tool_bar.style.display = "none"; 
    document.getElementById("main_preview").style.display = "none";



    updateImages(); //update images if there were changes. Not thes practice to reload all pics i think!
};

// back button in "background insert" logic
function backToMainBtn(){
    //console.log("back clicked!")
    const bg_images = document.getElementById('bg_images');
    const rmbg_images = document.getElementById('rmbg_images');
    const tool_bar = document.getElementById('tool_bar');
    const canvasPage = document.getElementById('canvasPage');
    const main_preview = document.getElementById('main_preview');

    bg_images.style.display = "none";
    rmbg_images.style.display = "block";
    tool_bar.style.display = "block";
    canvasPage.style.display = "none";
    main_preview.style.display = "block";


}

// checkmarking selected picture in "background insert"
// Old Code - going to rewrite for event delegation
// function Checkmark_picture() {
//     const pictures = document.querySelectorAll('.picture');
//         selectedPicture = null;

//         pictures.forEach(picture => {
//             picture.addEventListener('click', () => {
//                 if (selectedPicture) {
//                     selectedPicture.classList.remove('selected');
//                 }
//                 selectedPicture = picture;
//                 picture.classList.add('selected');
//             });
//         });

//         document.getElementById('submitBtn').addEventListener('click', () => {
//             if (selectedPicture) {

//                 const srcText = selectedPicture.getElementsByTagName('img')[0];
//                 const srcAlt = srcText.alt;
//                 console.log("fetch post: ", srcAlt);
                
//                 Fetch_post_bg_path(srcAlt);

//             } else {
//                 showError("You have not selected picture. Please select a picture.", 'red');
                
//             }
//         });
// };

// Event delegation version of checkmarking selected picture
function Checkmark_picture() {
    const bgContainer = document.getElementById('bg_images');
    let selectedPicture = null;

    if (!bgContainer) return;

    bgContainer.addEventListener('click', (event) => {
        const picture = event.target.closest('.picture');
        if (!picture || !bgContainer.contains(picture)) return;

        // Remove 'selected' class from previously selected picture
        if (selectedPicture && selectedPicture !== picture) {
            selectedPicture.classList.remove('selected');
        }

        // Toggle current picture selection
        if (picture.classList.contains('selected')) {
            picture.classList.remove('selected');
            selectedPicture = null;
        } else {
            picture.classList.add('selected');
            selectedPicture = picture;
        }
    });

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (selectedPicture) {
                const img = selectedPicture.querySelector('img');
                const srcAlt = img?.alt;
                console.log("fetch post:", srcAlt);
                Fetch_post_bg_path(srcAlt);
            } else {
                showError("You have not selected a picture. Please select one.", 'red');
            }
        });
    }
}


// function delete_bg_image() {
//     const bgContainer = document.getElementById('bg_images');

//     if (!bgContainer) return;

//     bgContainer.addEventListener('click', function(event) {
//         // DELETE button clicked
//         if (event.target.classList.contains('delete-btn')) {
//             event.stopPropagation(); // Prevent event bubbling
//             const pictureDiv = event.target.closest('.picture');
//             if (!pictureDiv) return;

//             const imageId = pictureDiv.dataset.imageId;
//             const imagePath = pictureDiv.querySelector('img').src;

//             if (confirm("Are you sure you want to delete this background image?")) {
//                 showLoadingSpinner();
                
//                 fetch(`/delete-background/${imageId}/`, {
//                     method: 'POST',
//                     headers: {
//                         'X-CSRFToken': getCookie('csrftoken'),
//                         'Content-Type': 'application/json'
//                     },
//                     body: JSON.stringify({
//                         image_path: imagePath
//                     })
//                 })
//                 .then(response => {
//                     hideLoadingSpinner();
//                     if (response.ok) {
//                         pictureDiv.remove(); // Remove from DOM
//                         showError("Background image deleted successfully", "green");
//                     } else {
//                         return response.json().then(err => {
//                             throw new Error(err.error || 'Failed to delete image');
//                         });
//                     }
//                 })
//                 .catch(err => {
//                     hideLoadingSpinner();
//                     console.error("Error deleting image:", err);
//                     showError(err.message || "Error deleting image", "red");
//                 });
//             }
//         }
//     });

//     // CSRF token helper function
//     function getCookie(name) {
//         let cookieValue = null;
//         if (document.cookie && document.cookie !== '') {
//             const cookies = document.cookie.split(';');
//             for (let i = 0; i < cookies.length; i++) {
//                 const cookie = cookies[i].trim();
//                 if (cookie.startsWith(name + '=')) {
//                     cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
//                     break;
//                 }
//             }
//         }
//         return cookieValue;
//     }
// }


function delete_bg_image() {
    const bgContainer = document.getElementById('bg_images');
    if (!bgContainer) return;

    // Modal elements
    const modal = document.getElementById('confirmationModal');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('confirmDelete');
    const cancelBtn = document.getElementById('cancelDelete');

    // Variables to store the current deletion context
    let currentPictureDiv = null;
    let currentImageId = null;
    let currentImagePath = null;

    bgContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('delete-btn')) {
            event.stopPropagation();
            currentPictureDiv = event.target.closest('.picture');
            if (!currentPictureDiv) return;

            currentImageId = currentPictureDiv.dataset.imageId;
            currentImagePath = currentPictureDiv.querySelector('img').src;

            // Show the modal
            modalMessage.textContent = "Are you sure you want to delete this background image?";
            modal.classList.remove('hidden');
        }
    });

    // Confirm deletion
    confirmBtn.addEventListener('click', function() {
        modal.classList.add('hidden');
        if (currentPictureDiv) {
            showLoadingSpinner();
            
            fetch(`/delete-background/${currentImageId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image_path: currentImagePath
                })
            })
            .then(response => {
                hideLoadingSpinner();
                if (response.ok) {
                    currentPictureDiv.remove();
                    showError("Background image deleted successfully", "green");
                } else {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Failed to delete image');
                    });
                }
            })
            .catch(err => {
                hideLoadingSpinner();
                console.error("Error deleting image:", err);
                showError(err.message || "Error deleting image", "red");
            });
        }
    });

    // Cancel deletion
    cancelBtn.addEventListener('click', function() {
        modal.classList.add('hidden');
        // Reset current deletion context
        currentPictureDiv = null;
        currentImageId = null;
        currentImagePath = null;
    });

    // Helper function to get CSRF token
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.startsWith(name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
}



function Fetch_post_bg_path(textData) {

    showLoadingSpinner();
    //const formData = img_path; // Collect form data


    fetch('/rmbg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',  // Specify JSON content
          'X-CSRFToken': '{{ csrf_token }}'    // CSRF token for Django
        },
        body: JSON.stringify({ text: textData })  // Send text as JSON
      })
      .then(response => {
        if (response.redirected) {
          window.location.href = response.url;  // Handle redirection if needed
        } else {
          return response.json();  // Handle the response as JSON
        }
      })
      .then(data => console.log(data))
      .catch(error => console.error('Error:', error));
  
    
};

function showError(message, color) {
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const dismissBtn = document.getElementById('dismiss-btn');
  
    // Set the custom error message
    errorText.textContent = message;
  
    // Setting background color
    errorMessage.style.backgroundColor = color;

    // Show the error message
    errorMessage.classList.remove('hidden');
    errorMessage.classList.add('visible');
  
    // Automatically hide the error message after 4 seconds
    const timeoutId = setTimeout(() => {
      hideError();
    }, 5000);
  
    // Allow the user to dismiss the message manually
    dismissBtn.onclick = () => {
      clearTimeout(timeoutId); // Cancel the automatic hide
      hideError();
    };
};
  
  function hideError() {
    const errorMessage = document.getElementById('error-message');
    errorMessage.classList.remove('visible');
    errorMessage.classList.add('hidden');
};

// Call updateImages whenever the user changes the background or edits an image
// Example usage: updateImages();
function updateImages() {
    const images = document.querySelectorAll('.clickable-image');
    images.forEach((img) => {
        const originalPath = img.getAttribute('data-path'); // Get the original path from data attribute
        img.src = `${originalPath}?t=${new Date().getTime()}`; // Append a query string
    });
}


// when Edit_Image_Btn clicked Edit_Image(x) called and canvasEdit(x,y)
function Edit_Image(imageSrc) {
    // Getting Elements and assigning it to variable
    const rmbg_images = document.getElementById("rmbg_images");
    const tool_bar = document.getElementById("tool_bar");
    const canvasPage = document.getElementById("canvasPage");

    // Hiding div_rmbg_images when bg_intsert button clicked

    rmbg_images.style.display = "none"; // hide
    tool_bar.style.display = "none";  // hide
    canvasPage.style.display = "block"; //show

    // removing data-path
    //imageSrc = imageSrc.split('?')[0]; 
    // Normalize the image source
    imageSrc = new URL(imageSrc.split('?')[0], window.location.origin).href;
    

    // replacing given path ".../output/..." with ".../rembg/..."
    //let givenImageSrc = imageSrc.replace("output", "rembg");
    // Get the path relative to media root
    let givenImageSrc = new URL(imageSrc);
    // Replace hardcoded path manipulations with more robust handling:
    givenImageSrc = givenImageSrc.pathname.replace("/media/", "").replace("output", "rembg");

    // replacing given path ".../output/..." with ".../initialUpload/..." and also updating format to ".jpg"
    //let originalImageSrc = imageSrc.replace("output", "initialUpload").replace(".png", ".jpg").replace("rembg", "initialUpload");
    let originalImageSrc = new URL(imageSrc);
    originalImageSrc = originalImageSrc.pathname.replace("/media/", "")
        .replace("output", "initialUpload")
        .replace(".png", ".jpg")
        .replace("rembg", "initialUpload");


    // Pass on the image source to canvasEdit
    // it take two variables canvasEdit (givenImageSrc, originalImageSrc)

    //debugging
    // console.log("imageSrc: ", imageSrc);
    // console.log("givenImageSrc: ", givenImageSrc);
    // console.log("originalImageSrc: ", originalImageSrc);

    canvasEdit(givenImageSrc, originalImageSrc);

} 


// Start - Toggles shadow dropdown 
function toggleDropdown(event) {
    console.log("shadow toggle clicked!")

    event.stopPropagation(); // Prevent clicks from bubbling up
    const dropdownContent = event.currentTarget.querySelector('.dropdown-content');
    const isVisible = dropdownContent.style.display === 'block';
    // Hide all other dropdowns
    document.querySelectorAll('.dropdown-content').forEach(content => {
        content.style.display = 'none';
    });
    // Toggle current dropdown visibility
    dropdownContent.style.display = isVisible ? 'none' : 'block';
}

// Prevent dropdown from closing when interacting with its content
document.querySelectorAll('.dropdown-content').forEach(content => {
    content.addEventListener('click', event => {
        event.stopPropagation();
    });
});

// Hide dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-content').forEach(content => {
        content.style.display = 'none';
    });

});


function showLoadingSpinner() {
    // Create spinner container
    const spinnerContainer = document.createElement("div");
    spinnerContainer.id = "spinner-container";
    spinnerContainer.style.position = "fixed";
    spinnerContainer.style.top = "0";
    spinnerContainer.style.left = "0";
    spinnerContainer.style.width = "100%";
    spinnerContainer.style.height = "100%";
    spinnerContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    spinnerContainer.style.display = "flex";
    spinnerContainer.style.justifyContent = "center";
    spinnerContainer.style.alignItems = "center";
    spinnerContainer.style.zIndex = "9999";

    // Create spinner
    const spinner = document.createElement("div");
    spinner.style.border = "8px solid #f3f3f3";
    spinner.style.borderTop = "8px solid #3498db";
    spinner.style.borderRadius = "50%";
    spinner.style.width = "60px";
    spinner.style.height = "60px";
    spinner.style.animation = "spin 1s linear infinite";
    spinnerContainer.appendChild(spinner);

    // Create message
    const message = document.createElement("p");
    message.textContent = "Processing... Please do not reload the page.";
    message.style.color = "white";
    message.style.marginTop = "10px";
    message.style.fontSize = "16px";
    message.style.padding = "10px";
    spinnerContainer.appendChild(message);

    // Add spinner container to the body
    document.body.appendChild(spinnerContainer);

    // Add CSS animation for spinner
    const style = document.createElement("style");
    style.innerHTML = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
};

function hideLoadingSpinner() {
    const spinnerContainer = document.getElementById("spinner-container");
    if (spinnerContainer) {
        spinnerContainer.remove();
    }
};
// END Loading spinner



function textBtn(){ // new async added
    window.selectedPicture = []; // Reset to empty array when entering design mode
    //window.selectedCanvas = []; // Reset selected canvases // new


    console.log("text btn working");
    document.getElementById("tool_bar").style.display = "none";
    document.getElementById("main_preview").style.display = "none";
    document.getElementById("select-canvas").style.display = "block";
    const canvases = document.querySelectorAll(".canvas-item");
    


     // Show checkmarks
     document.querySelectorAll(".checkmark").forEach(checkmark => {
        checkmark.style.display = "block";
    });



    // backToMain page reloads (Other ways giving bugs =(...)
    document.querySelectorAll(".backToMain").forEach(btn => {
        btn.addEventListener("click", () => {
            location.reload();
        });
    });
    

    // Toggle selection when clicking a canvas
    canvases.forEach(canvas => {
        canvas.addEventListener("click", function() {
            canvas.classList.toggle("selected");
            // const checkmark = canvas.querySelector(".checkmark");
            // checkmark.style.display = canvas.classList.contains("selected") ? "flex" : "block";
        });
    });

    // Select all canvases
    selectAllBtn.addEventListener("click", function() {
        const allSelected = [...canvases].every(c => c.classList.contains("selected"));
        canvases.forEach(canvas => {
            canvas.classList.toggle("selected", !allSelected);
            //canvas.querySelector(".checkmark").style.display = !allSelected ? "flex" : "none";
        });
    });

    // NEXt button clicked, Proceed with selected canvases
    nextTextBtn.addEventListener("click", function() {
        const selectedCanvases = document.querySelectorAll(".canvas-item.selected");
        
        if (selectedCanvases.length === 0) {
            showError("Error: Please select at least one canvas.", 'red')
            return;
        }

        // set disableFetchMetadata to true
        window.disableFetchMetadata = true; // Disable metadata fetching for text editing 
        console.log("disableFetchMetadata rmbg.js:", window.disableFetchMetadata);

        //selectedPicture = []; // Array to store selected canvas filenames

        //console.log("Selected canvases:", selectedCanvases); // new commented out
        // Log the src of each selected canvas
        selectedCanvases.forEach(span => {
            const src = span.src;
            //const filename = src.substring(src.lastIndexOf('/') + 1).split('?')[0];
            //selectedPicture.push(filename); // Add filename to array
            // let cleanSrc = "http://127.0.0.1:8000/"+src.split('?')[0];
            let cleanSrc = window.location.origin +"/"+ src.split('?')[0];
            selectedPicture.push(cleanSrc); // get the image src //new code
            //selectedPicture.push(src); // get the image src //new code
        });

        const no_container = document.getElementById("no_container");
        if(no_container) {no_container.id = "omg_container";}
        
        console.log("Selected pictures:", selectedPicture); // Log the array
        // assign selectedPictures to selectedCanvas
        window.selectedCanvas = window.selectedPicture;

        // New
        // Load design for the first selected canvas immediately
        if (window.selectedCanvas.length > 0) {
            window.loadDesignForImage(window.selectedCanvas[0]);
        }
        
        // Add logic to proceed to text-editing functionality
        textEditing(selectedPicture);
        

    });

    
};


function textEditing(selectedPicture){
    
    //if no pictures selected return error msg
    if (selectedPicture.length === 0) {
        showError("Error: Please select at least one canvas.", 'red')
        return;
    }
    const allCanvases = document.querySelectorAll(".canvas-item");
    const selectedCanvases = document.querySelectorAll(".canvas-item.selected");
    const checkmarks = document.querySelectorAll(".checkmark");
    const clickableImages = document.querySelectorAll(".clickable-image")
    // Hide all canvases
    allCanvases.forEach(canvas => {
        canvas.style.display = "none";
        canvas.classList.remove("canvas-item");
    });

    // Show only selected canvases
    selectedCanvases.forEach(canvas => {
        canvas.style.display = "block";
        canvas.classList.remove("selected"); // Remove 'selected' class 
    });

    checkmarks.forEach(checkmark => {
        checkmark.style.display = "none";
    });

    document.getElementById("select-canvas").style.display = "none";
    
    clickableImages.forEach(img => {
        img.classList.remove("clickable-image");
    })

    document.getElementById("static-content").style.display = "block";

}


// Create a Template START -------------------
function setupTemplateCreation() {
    const createTemplateBtn = document.getElementById('create-template-btn');
    const templateModal = document.getElementById('template-creation-modal');
    const cancelTemplateBtn = document.getElementById('cancel-template-btn');
    
    // Show modal when "Create a Template" is clicked
    createTemplateBtn.addEventListener('click', function() {
        // Reset form
        document.getElementById('template-title').value = '';
        document.getElementById('include-background').checked = true;
        templateModal.style.display = 'flex';
    });
    
    // Hide modal when Cancel is clicked
    cancelTemplateBtn.addEventListener('click', function() {
        templateModal.style.display = 'none';
    });
    
    // Save template
    document.getElementById('save-template-btn').addEventListener('click', function() {
        const templateTitle = document.getElementById('template-title').value.trim();
        
        if (!templateTitle) {
            showError("Please enter a template title", "red");
            return;
        }
        
        // Collect template data
        const templateData = {
            title: templateTitle,
            background: document.getElementById('include-background').checked
        };
        
        // Here you would typically send the templateData to your server
        console.log("Template saved:", templateData);
        
        // Show success message and close modal
        showError("Template \"" + templateData.title + "\" saved successefuly!", "green");
        
        
        
        // get metadata for canvas
        // state has current canvasStateDesignGlobal of canvas
        const state = window.canvasStateDesignGlobal;
        console.log("current design:", state);

        // const data = {
        //     project_id: project_id,
        //     designMetadata: state
        // };
        // Prepare the data structure
        const logo_path = state.logo.image.currentSrc;
        const data = {
            template_name: templateData.title,
            project_id: project_id,
            logo_path: logo_path,
            designMetadata: {
                header: state.header || {},
                footer: state.footer || {},
                logo: state.logo || {}
            }
        };
        console.log("Logo path: ", state.logo.image.currentSrc);
        
        // Fetch POST to save design template to sqlite database

        fetch('design_template/', {  // Adjust URL based on your Django URL structure
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken() // Include CSRF token
            },
            body: JSON.stringify(data) 
        })
        .then(response => response.json())
        .then(data => {
            console.log("Response from server:", data);
            showError("designed template created", "green")
            
        })
        .catch(error => {
            console.error("Error saving metadata:", error);
            showError("Error saving metadata: " + error, "red");
        });

        templateModal.style.display = 'none';


    });
}

// Function to get CSRF token from Django's cookies
function getCSRFToken() {
    const cookieValue = document.cookie.match(/csrftoken=([^ ;]+)/);
    return cookieValue ? cookieValue[1] : '';
}

// Create a Template END -------------------


// function for hover dropdown for account in top nav

function accountDropdown() {
    const accountDropdown = document.querySelector('.account-dropdown');
    const dropdownContent = document.querySelector('.account-dropdown-content');
    
    if (accountDropdown) {
        // Toggle dropdown on click
        accountDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
        });
        
        // Close when clicking elsewhere
        document.addEventListener('click', function(e) {
            if (!accountDropdown.contains(e.target)) {
                accountDropdown.classList.remove('active');
            }
        });
        
        // Prevent dropdown from closing when clicking inside it
        dropdownContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}


// Now you can query your own DB instead of Stripe
async function getUsage() {
    try {
        console.log("getUsage started!!!")
        const response = await fetch('/api/usage/');
        
        if (!response.ok) {
            throw new Error('Failed to load usage data');
        }
        
        const data = await response.json();
        console.log(data);
        const display = document.getElementById('usage-display');
        if (display) {
            display.innerHTML = `
                <strong>Plan:</strong> ${data.plan}<br>
                <strong>Usage:</strong> ${data.used}/${data.limit} images<br>
                <strong>Resets:</strong> ${data.reset_date}
            `;
        }
    } catch (error) {
        console.error('Usage error:', error);
        const display = document.getElementById('usage-display');
        if (display) {
            display.innerHTML = 'Usage data unavailable';
        }
    }
}