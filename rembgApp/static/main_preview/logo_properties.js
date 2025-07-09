// New code for logo -------------------------
const logoState = {
    image: new Image(),
    x: 100,
    y: 100,
    scale: 0.1
};

export function getLogo() {
    return logoState;
}

export function setLogo(img, x = 100, y = 100, scale = 0.1) {
    logoState.image = img;
    logoState.x = x;
    logoState.y = y;
    logoState.scale = scale;
}

// End new code for logo -------------------------


// LOGO image initializing
export let logoImage = new Image(); // Image object for the logo
export let logoX = 100;  // Position for the logo on the canvas
export let logoY = 100;  // Position for the logo on the canvas
export let logoScale = 0.1; // Scale for the logo


// Flag to track if logo upload listener has been initialized
let logoUploadInitialized = false;

let file = null; // Variable to store the uploaded file

export function initializeLogo (canvas){

    // new code-------------------
    // Check if metadata exists for this canvas and has logo info
    const meta = metadataMap.get(canvas);
    if (meta && meta.design_data && meta.design_data.logo_path) {
        logoImage = new Image();
        logoImage.src = meta.design_data.logo_path;
        logoX = meta.design_data.logo_x || 100;
        logoY = meta.design_data.logo_y || 100;
        logoScale = meta.design_data.logo_scale || 0.1;
        
        logoImage.onload = function() {
            canvasDrawLogo(); // Redraw canvas when logo loads
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
                logoImage.src = event.target.result; // Set the uploaded image as the source for the logo image
                logoImage.onload = function() {
                    canvasDrawLogo(); // Redraw the canvas with the logo
                };
            };
            reader.readAsDataURL(file); // Convert the uploaded file to data URL
        }
        canvasDrawLogo(); // Redraw canvas
    });

     // Only initialize the logo upload once
    if (!logoUploadInitialized) {
        document.getElementById('saveTextBtn').addEventListener('click', function(e) {
            console.log("logo saved!");
            console.log("Save Text Log: ", file.src);
            //const file = e.target.files[0];
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
                        logoImage.src = '/' + data.logo_path; // Set the logo source to the saved path src
                        console.log("Logo uploaded successfully:", logoImage);
                        logoImage.onload = function() {
                            canvasDrawLogo(); // Redraw the canvas with the logo
                        };
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
                    logoImage.src = event.target.result;
                    
                    logoImage.onload = function() {
                        canvasDrawLogo();
                    };
                };
                reader.readAsDataURL(file);
            }
        });

        // Optionally reset logo position/scale or image
        // Uncomment if desired:
        // logoX = 100;
        // logoY = 100;
        // logoScale = 0.1;
        // logoImage.src = "";  // Clear the logo image if needed
        
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
    function isMouseOverLogo(mouseX, mouseY) {
        const logoWidth = logoImage.width * logoScale;
        const logoHeight = logoImage.height * logoScale;

        // Calculate the bounds of the logo
        const logoLeft = logoX;
        const logoRight = logoX + logoWidth;
        const logoTop = logoY;
        const logoBottom = logoY + logoHeight;

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

        if (isMouseOverLogo(mouseX, mouseY)) {
            //console.log("Logo mousedown triggered - isMouseOverLogo ");
            isLogoDragging = true;
            logoDragOffsetX = mouseX - logoX;
            logoDragOffsetY = mouseY - logoY;
        }
    });

    // Move the logo while dragging
    canvas.addEventListener('mousemove', (e) => {
        if (isLogoDragging) {

            const { mouseX, mouseY } = getScaledMouseCoordinates(canvas, e);

            logoX = mouseX - logoDragOffsetX;
            logoY = mouseY - logoDragOffsetY;

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

        const { mouseX, mouseY } = getScaledMouseCoordinates(canvas, e);

        if (isMouseOverLogo(mouseX, mouseY)) {
            //console.log('Logo wheel triggered - isMouseOverLogo');
            // Scale the logo based on the wheel direction
            const delta = e.deltaY > 0 ? -0.01 : 0.01;
            logoScale = Math.max(0.05, logoScale + delta); // Prevent scale from going below 0.1
            canvasDrawLogo(); // Redraw the canvas
            e.preventDefault(); // Prevent default scrolling behavior
        }
    }, { passive: false });
}

export function canvasDrawLogo() { //export
    const event = new CustomEvent('canvasDrawLogo', { // canvasDrawLogo
        detail: {
            logoImage,
            logoX,
            logoY,
            logoScale,
        }
        
    });
    document.dispatchEvent(event);

}
