import { getCanvasStateDesign, updateCanvasStateDesign } from './metadata_fetch.js';



// Flag to track if logo upload listener has been initialized
let logoUploadInitialized = false;

let file = null; // Variable to store the uploaded file

export function initializeLogo (canvas){

    // new code-------------------
    // Check if metadata exists for this canvas and has logo info
    const meta = metadataMap.get(canvas);
    if (meta && meta.design_data && meta.design_data.logo_path) {
        const img = new Image();
        img.src = meta.design_data.logo_path;
        img.onload = () => {
            updateCanvasStateDesign({
                logo: {
                    image: img,
                    x: meta.design_data.logo_x || 100,
                    y: meta.design_data.logo_y || 100,
                    scale: meta.design_data.logo_scale || 0.1
                }
            });
            canvasDrawLogo(); // Redraw the canvas with the logo
        };
    }
    // end new code-----------------


    // LOGO image Function to handle the image upload
    document.getElementById('logo-upload').addEventListener('change', function(e) {
        file = e.target.files[0];
        console.log("Upload log: ", file);
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.src = event.target.result; // Set the uploaded image as the source for the logo image
                img.onload = function() {
                    const state = getCanvasStateDesign();
                    updateCanvasStateDesign({
                        logo: {
                            ...state.logo,
                            image: img, // Update the logo image in the state
                        }
                    });
                    canvasDrawLogo(); // Redraw the canvas with the logo
                };
            };
            reader.readAsDataURL(file); // Convert the uploaded file to data URL
        }
    });

     // Only initialize the logo upload once
    if (!logoUploadInitialized) {
        document.getElementById('saveTextBtn').addEventListener('click', function(e) {
            
            // Check if file is selected
            if (file === null) {
                console.log("No file selected for upload.");
                return; // Exit if no file is selected
            }

            if (file) {
                console.log("File to be uploaded:", file); // Debug log

                // Prepare form data
                const formData = new FormData();
                formData.append('logo', file); // Append the file to the form data 
                formData.append('selectedPictures', JSON.stringify(selectedPicture)); // Append selected pictures
                formData.append('project_id', project_id); // Append the project ID to the form data
                // Send to server for saving
                fetch('/upload_logo/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken'), // Ensure you have CSRF token
                    },
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        const img = new Image();
                        img.src = '/' + data.logo_path;
                        img.onload = () => {
                            // Update the canvas state with the new logo image and its properties
                            const state = getCanvasStateDesign();
                            updateCanvasStateDesign({
                                logo: {
                                    ...state.logo,
                                    image: img
                                }
                            });
                            canvasDrawLogo(); // Redraw the canvas with the new logo
                        }
                    } else {
                        console.error('Logo upload failed:', data.error);
                    }
                })
                .catch(error => {
                    console.error('Error uploading logo:', error);
                });
            }
        });

        // Helper function to get CSRF token
        function getCookie(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
        logoUploadInitialized = true;
        
    }
    

    // resetting/removing logo from canvas
    document.getElementById('resetLogoInput').addEventListener('click', function() {
        console.log("Reset clicked: logo_properties.js");

        const oldInput = document.getElementById('logo-upload');
        const newInput = oldInput.cloneNode(true);
        newInput.id = 'logo-upload'; // Make sure the ID remains consistent

        // Replace the old input with the new one
        oldInput.parentNode.replaceChild(newInput, oldInput);

        // Reattach the upload event listener to the new input
        newInput.addEventListener('change', function(e) {
            file = e.target.files[0];
            if (file) {

                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = () => {
                        // Update the canvas state with the new logo image and its properties
                        const state = getCanvasStateDesign();
                        updateCanvasStateDesign({
                            logo: {
                                ...state.logo,
                                image: img, // Update the logo image in the state
                            }
                        });
                        canvasDrawLogo(); // Redraw the canvas with the logo
                    };
                };
                reader.readAsDataURL(file);
            }
        });

        // Optional reset logic:
        const state = getCanvasStateDesign();
        updateCanvasStateDesign({
            logo: {
                ...state.logo,
                image: null,
                x: 100,
                y: 100,
                scale: 0.1
            }
        });
        canvasDrawLogo(); // Redraw canvas
    });

    // logo image mouse event START------------------------------------------
    let isLogoDragging = false; // To track if the logo is being dragged
    let logoDragOffsetX = 0, logoDragOffsetY = 0; // Offset for dragging
   

    function getScaledMouseCoordinates(canvas, e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;  // Logical width / Display width
        const scaleY = canvas.height / rect.height; // Logical height / Display height
    
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
    
        return { mouseX, mouseY };
    }
    
    // Check if the mouse is over the logo
    function isMouseOverLogo(mouseX, mouseY, logo) {
        if (!logo.image) return false;
        const logoWidth = logo.image.width  * logo.scale;
        const logoHeight = logo.image.height * logo.scale;

        // Calculate the bounds of the logo
        const logoLeft = logo.x;
        const logoRight = logo.x + logoWidth;
        const logoTop = logo.y;
        const logoBottom = logo.y + logoHeight;

        return (
            mouseX >= logoLeft &&
            mouseX <= logoRight &&
            mouseY >= logoTop &&
            mouseY <= logoBottom
        );
    }
   
    // Start dragging the logo
    canvas.addEventListener('mousedown', (e) => {
        //const rect = canvas.getBoundingClientRect();
        const { mouseX, mouseY } = getScaledMouseCoordinates(canvas, e);
        //console.log("logo mousedown triggered");
        const state = getCanvasStateDesign();
        const { logo } = state;
        if (isMouseOverLogo(mouseX, mouseY, logo)) {
            //console.log("Logo mousedown triggered - isMouseOverLogo ");
            isLogoDragging = true;
            logoDragOffsetX = mouseX - logo.x;
            logoDragOffsetY = mouseY - logo.y;
        }
    });

    // Move the logo while dragging
    canvas.addEventListener('mousemove', (e) => {
        if (isLogoDragging) {

            const { mouseX, mouseY } = getScaledMouseCoordinates(canvas, e);
            const state = getCanvasStateDesign();
            updateCanvasStateDesign({
                logo: {
                    ...state.logo,
                    x: mouseX - logoDragOffsetX, // Update the logo's x position
                    y: mouseY - logoDragOffsetY, // Update the logo's y position
                }
            });
        
            canvasDrawLogo(); // Redraw the canvas
        }
    });

    // Stop dragging the logo
    canvas.addEventListener('mouseup', () => {
        isLogoDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isLogoDragging = false;
    });

    // Resize the logo with the mouse wheel
    canvas.addEventListener('wheel', (e) => {
        // Check if the logo is being dragged   
        const { mouseX, mouseY } = getScaledMouseCoordinates(canvas, e);
        const state = getCanvasStateDesign();
        const { logo } = state;

        if (isMouseOverLogo(mouseX, mouseY, logo)) {

            const newScale = Math.max(0.05, logo.scale + (e.deltaY > 0 ? -0.01 : 0.01)); // Prevent scale from going below 0.05
            // Update the logo scale in the state
            updateCanvasStateDesign({
                logo: {
                    ...state.logo,
                    scale: newScale, // Update the logo's scale
                }
            });
            
            canvasDrawLogo(); // Redraw the canvas with the updated logo scale
            e.preventDefault(); // Prevent default scrolling behavior
        }
    }, { passive: false });
}



export function canvasDrawLogo() { //export
    const {logo} = getCanvasStateDesign(); // Get the current canvas state
    const event = new CustomEvent('canvasDrawLogo', { // canvasDrawLogo
        detail: {
            logoImage: logo.image, // Use the logo image from the state
            logoX: logo.x, // Use the logo x position from the state
            logoY: logo.y, // Use the logo y position from the state
            logoScale: logo.scale, // Use the logo scale from the state
        }
        
    });
    document.dispatchEvent(event);

}
