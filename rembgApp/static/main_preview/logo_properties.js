import { getCanvasStateDesign, updateCanvasStateDesign } from './metadata_fetch.js';

// Flag to track if logo upload listener has been initialized
let logoUploadInitialized = false;

export function initializeLogo(canvas) {
    // Check if metadata exists for this canvas and has logo info
    const meta = metadataMap.get(canvas);
    if (meta && meta.design_data && meta.design_data.logo_path) {
        loadLogoFromServer(meta.design_data.logo_path);
    }

    // Initialize logo upload functionality only once
    if (!logoUploadInitialized) {
        setupLogoUpload();
        setupLogoReset();
        setupLogoDragAndDrop(canvas);
        logoUploadInitialized = true;
    }
    // Set up drag and drop for THIS specific canvas (each canvas needs its own)
    setupLogoDragAndDrop(canvas);
}

function setupLogoUpload() {
    document.getElementById('logo-upload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            uploadLogo(file);
        }
    });
}

function setupLogoReset() {
    document.getElementById('resetLogoInput').addEventListener('click', function() {
        resetLogo();
    });
}

function uploadLogo(file) {
    console.log("Uploading logo:", file);
    
    // Prepare form data
    const formData = new FormData();
    formData.append('logo', file);
    
    // Normalize selected picture paths
    const cleanPaths = selectedPicture.map(pic => 
        pic.replace(window.location.origin, '')
        .replace(/^\/media\//, '')
        .split('?')[0]
    );
    
    formData.append('selectedPictures', JSON.stringify(cleanPaths));
    formData.append('project_id', project_id);
    
    // Send to server for saving
    fetch('/upload_logo/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
        },
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.error || 'Server error');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // Update the canvas state with the new logo image
            loadLogoFromServer(data.logo_path);
            showSuccess("Logo uploaded successfully", "green");
        } else {
            showErrorLogo(data.error || "Logo upload failed", "red");
            console.error('Logo upload failed:', data.error);
        }
    })
    .catch(error => {
        showErrorLogo(error.message || "Error uploading logo", "red");
        console.error('Error uploading logo:', error);
    });
}

function loadLogoFromServer(logoPath) {
    const img = new Image();
    
    // Handle S3 paths and local paths
    let fullLogoPath;
    
    if (logoPath.startsWith('http')) {
        fullLogoPath = logoPath;
    } else if (logoPath.startsWith('media/')) {
        // This is an S3 path - construct the S3 URL
        //fullLogoPath = `https://${settings.AWS_STORAGE_BUCKET_NAME}.s3.${settings.AWS_S3_REGION_NAME}.amazonaws.com/${logoPath}`;
        fullLogoPath = `https://autobgpro-bkt.s3.amazonaws.com/${logoPath}`;
        console.log("Loading logo from S3 URL:", fullLogoPath);
    } else if (logoPath.startsWith('/')) {
        fullLogoPath = window.location.origin + logoPath;
    } else {
        fullLogoPath = window.location.origin + '/' + logoPath;
    }
    
    img.src = fullLogoPath;
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
        const state = getCanvasStateDesign();
        updateCanvasStateDesign({
            logo: {
                ...state.logo,
                image: img,
                x: state.logo.x || 100,
                y: state.logo.y || 100,
                scale: state.logo.scale || 0.1
            }
        });
        canvasDrawLogo();
    };
    
    img.onerror = () => {
        console.error('Failed to load logo from:', fullLogoPath);
        showErrorLogo("Failed to load logo image", "red");
        
        // Try to get a fresh presigned URL if this is S3
        if (logoPath.startsWith('media/')) {
            fetch('/get_logo_url/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify({ logo_path: logoPath })
            })
            .then(response => response.json())
            .then(data => {
                if (data.url) {
                    img.src = data.url;
                }
            });
        }
    };
}

function resetLogo() {
    console.log("Resetting logo");
    
    // Clear the file input
    const logoUpload = document.getElementById('logo-upload');
    logoUpload.value = '';
    
    // Update the canvas state to remove the logo
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
    
    // Redraw the canvas without the logo
    canvasDrawLogo();
    
    // Send reset request to server
    const cleanPaths = selectedPicture.map(pic => 
        pic.replace(window.location.origin, '')
        .replace(/^\/media\//, '')
        .split('?')[0]
    );
    
    const formData = new FormData();
    formData.append('selectedPictures', JSON.stringify(cleanPaths));
    formData.append('project_id', project_id);
    
    fetch('/upload_logo/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server error during logo reset');
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            console.log('Logo cleared successfully on server');
        }
    })
    .catch(error => {
        console.error('Error clearing logo on server:', error);
    });
}

function setupLogoDragAndDrop(canvas) {
    let isLogoDragging = false;
    let logoDragOffsetX = 0, logoDragOffsetY = 0;

    function getScaledMouseCoordinates(canvas, e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
    
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
    
        return { mouseX, mouseY };
    }
    
    function isMouseOverLogo(mouseX, mouseY, logo) {
        if (!logo.image) return false;
        const logoWidth = logo.image.width * logo.scale;
        const logoHeight = logo.image.height * logo.scale;

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
        const { mouseX, mouseY } = getScaledMouseCoordinates(canvas, e);
        const state = getCanvasStateDesign();
        const { logo } = state;
        
        if (isMouseOverLogo(mouseX, mouseY, logo)) {
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
                    x: mouseX - logoDragOffsetX,
                    y: mouseY - logoDragOffsetY,
                }
            });
            canvasDrawLogo();
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
        const state = getCanvasStateDesign();
        const { logo } = state;

        if (isMouseOverLogo(mouseX, mouseY, logo)) {
            const newScale = Math.max(0.05, logo.scale + (e.deltaY > 0 ? -0.01 : 0.01));
            updateCanvasStateDesign({
                logo: {
                    ...state.logo,
                    scale: newScale,
                }
            });
            canvasDrawLogo();
            e.preventDefault();
        }
    }, { passive: false });
}

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

function showErrorLogo(message, color) {
    // Implement your error display logic here
    console.error(message);
    alert(message); // Simple alert for now
}

function showSuccess(message, color) {
    // Implement your success display logic here
    console.log(message);
    // You can use your existing success display functions
}

export function canvasDrawLogo() {
    const {logo} = getCanvasStateDesign();
    const event = new CustomEvent('canvasDrawLogo', {
        detail: {
            logoImage: logo.image,
            logoX: logo.x,
            logoY: logo.y,
            logoScale: logo.scale,
        }
    });
    document.dispatchEvent(event);
}



// import { getCanvasStateDesign, updateCanvasStateDesign } from './metadata_fetch.js';

// // Flag to track if logo upload listener has been initialized
// let logoUploadInitialized = false;

// let file = null; // Variable to store the uploaded file

// export function initializeLogo (canvas){

//     // Check if metadata exists for this canvas and has logo info
//     const meta = metadataMap.get(canvas);
//     if (meta && meta.design_data && meta.design_data.logo_path) {
//         const img = new Image();
//         img.src = meta.design_data.logo_path;
//         img.onload = () => {
//             updateCanvasStateDesign({
//                 logo: {
//                     image: img,
//                     x: meta.design_data.logo_x || 100,
//                     y: meta.design_data.logo_y || 100,
//                     scale: meta.design_data.logo_scale || 0.1
//                 }
//             });
//             canvasDrawLogo(); // Redraw the canvas with the logo
//         };
//     }
//     // end new code-----------------


//     // LOGO image Function to handle the image upload
//     document.getElementById('logo-upload').addEventListener('change', function(e) {
//         file = e.target.files[0];
//         console.log("Upload log: ", file);
//         if (file) {
//             const reader = new FileReader();
//             reader.onload = function(event) {
//                 const img = new Image();
//                 img.src = event.target.result; // Set the uploaded image as the source for the logo image
//                 img.onload = function() {
//                     const state = getCanvasStateDesign();
//                     updateCanvasStateDesign({
//                         logo: {
//                             ...state.logo,
//                             image: img, // Update the logo image in the state
//                         }
//                     });
//                     canvasDrawLogo(); // Redraw the canvas with the logo
//                 };
//             };
//             reader.readAsDataURL(file); // Convert the uploaded file to data URL
//         }
//     });

//      // Only initialize the logo upload once
//     if (!logoUploadInitialized) {
//         document.getElementById('saveTextBtn').addEventListener('click', function(e) {
            
//             const state = getCanvasStateDesign();
//             // Check if file is selected
//             // if (file === null) {
//             //     console.log("No file selected for upload.");
//             //     return; // Exit if no file is selected
//             // }
//             // Check if we have a logo image or if it was reset
//             if (state.logo.image === null) {
//                 // Handle logo reset case
//                 const formData = new FormData();
//                 formData.append('selectedPictures', JSON.stringify(selectedPicture)); //selectedPicture
//                 formData.append('project_id', project_id);
                
//                 fetch('/upload_logo/', {
//                     method: 'POST',
//                     body: formData,
//                     headers: {
//                         'X-CSRFToken': getCookie('csrftoken'),
//                     },
//                 })
//                 .then(response => response.json())
//                 .then(data => {
//                     if (data.status === 'success') {
//                         console.log('Logo cleared successfully');
//                     }
//                     if (data.error) {
                        
//                         console.log(data.error);
//                         return;
//                     }
//                 })
//                 .catch(error => {
//                     console.error('Error clearing logo:', error);
//                 });
//             }

//             if (file) {
//                 console.log("File to be uploaded:", file); // Debug log

//                 // loop through the array and Normalized path
//                 const cleanPaths = selectedPicture.map(pic => 
//                     pic.replace(window.location.origin, '')
//                     .replace(/^\/media\//, '')
//                     .split('?')[0]
//                 );

//                 // Prepare form data
//                 const formData = new FormData();
//                 formData.append('logo', file); // Append the file to the form data 
//                 formData.append('selectedPictures', JSON.stringify(cleanPaths)); // Append selected pictures
//                 formData.append('project_id', project_id); // Append the project ID to the form data
//                 // Send to server for saving
//                 fetch('/upload_logo/', { // '/upload_logo/'
//                     method: 'POST',
//                     body: formData,
//                     headers: {
//                         'X-CSRFToken': getCookie('csrftoken'), // Ensure you have CSRF token
//                     },
//                 })
//                 .then(response => response.json())
//                 .then(data => {
//                     if (data.status === 'success') {
//                         const img = new Image();
//                         img.src = '/' + data.logo_path;
//                         //img.src = data.logo_path; // Frontend should handle full URL construction if needed
//                         img.onload = () => {
//                             // Update the canvas state with the new logo image and its properties
//                             const state = getCanvasStateDesign();
//                             updateCanvasStateDesign({
//                                 logo: {
//                                     ...state.logo,
//                                     image: img
//                                 }
//                             });
//                             canvasDrawLogo(); // Redraw the canvas with the new logo
//                         }
//                     } else {
//                         showError(data.error, "red");
//                         alert("You have 20 logo images saved. Please delete old logos to upload more.");
//                         console.error('Logo upload failed:', data.error);  
//                     }
//                 })
//                 .catch(error => {
//                     //showError(data.error, "red");
//                     showErrorLogo("You have 20 logo images saved. Please delete old logos to upload more.", "red")
//                     alert("You have 20 logo images saved. Please delete old logos to upload more.");
//                     console.error('Error uploading logo:', error);
//                 });
//             }
//         });

//         // Helper function to get CSRF token
//         function getCookie(name) {
//             let cookieValue = null;
//             if (document.cookie && document.cookie !== '') {
//                 const cookies = document.cookie.split(';');
//                 for (let i = 0; i < cookies.length; i++) {
//                     const cookie = cookies[i].trim();
//                     if (cookie.substring(0, name.length + 1) === (name + '=')) {
//                         cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
//                         break;
//                     }
//                 }
//             }
//             return cookieValue;
//         }
//         logoUploadInitialized = true;
        
//     }
//     // Reset logo function - fix to handle S3 paths
//     document.getElementById('resetLogoInput').addEventListener('click', function() {
//         console.log("Reset logo clicked");
        
//         // Clear the file input
//         const logoUpload = document.getElementById('logo-upload');
//         logoUpload.value = '';
        
//         // Clear the current file reference
//         file = null;
        
//         // Get current state
//         const state = getCanvasStateDesign();
        
//         // Check if current logo is a base64 data URL and clear it properly
//         if (state.logo.image && state.logo.image.src && state.logo.image.src.startsWith('data:')) {
//             // This is a base64 image, we need to clear it properly
//             updateCanvasStateDesign({
//                 logo: {
//                     image: null,
//                     x: 100,
//                     y: 100,
//                     scale: 0.1,
//                     path: null // Clear the path too
//                 }
//             });
//         } else {
//             // Regular logo reset
//             updateCanvasStateDesign({
//                 logo: {
//                     ...state.logo,
//                     image: null,
//                     path: null
//                 }
//             });
//         }
        
//         // Redraw the canvas without the logo
//         canvasDrawLogo();
        
//         // Dispatch an event to indicate logo was reset
//         const event = new CustomEvent('logoReset');
//         document.dispatchEvent(event);
//     });
    

//     // logo image mouse event START------------------------------------------
//     let isLogoDragging = false; // To track if the logo is being dragged
//     let logoDragOffsetX = 0, logoDragOffsetY = 0; // Offset for dragging
   

//     function getScaledMouseCoordinates(canvas, e) {
//         const rect = canvas.getBoundingClientRect();
//         const scaleX = canvas.width / rect.width;  // Logical width / Display width
//         const scaleY = canvas.height / rect.height; // Logical height / Display height
    
//         const mouseX = (e.clientX - rect.left) * scaleX;
//         const mouseY = (e.clientY - rect.top) * scaleY;
    
//         return { mouseX, mouseY };
//     }
    
//     // Check if the mouse is over the logo
//     function isMouseOverLogo(mouseX, mouseY, logo) {
//         if (!logo.image) return false;
//         const logoWidth = logo.image.width  * logo.scale;
//         const logoHeight = logo.image.height * logo.scale;

//         // Calculate the bounds of the logo
//         const logoLeft = logo.x;
//         const logoRight = logo.x + logoWidth;
//         const logoTop = logo.y;
//         const logoBottom = logo.y + logoHeight;

//         return (
//             mouseX >= logoLeft &&
//             mouseX <= logoRight &&
//             mouseY >= logoTop &&
//             mouseY <= logoBottom
//         );
//     }
   
//     // Start dragging the logo
//     canvas.addEventListener('mousedown', (e) => {
//         //const rect = canvas.getBoundingClientRect();
//         const { mouseX, mouseY } = getScaledMouseCoordinates(canvas, e);
//         //console.log("logo mousedown triggered");
//         const state = getCanvasStateDesign();
//         const { logo } = state;
//         if (isMouseOverLogo(mouseX, mouseY, logo)) {
//             //console.log("Logo mousedown triggered - isMouseOverLogo ");
//             isLogoDragging = true;
//             logoDragOffsetX = mouseX - logo.x;
//             logoDragOffsetY = mouseY - logo.y;
//         }
//     });

//     // Move the logo while dragging
//     canvas.addEventListener('mousemove', (e) => {
//         if (isLogoDragging) {

//             const { mouseX, mouseY } = getScaledMouseCoordinates(canvas, e);
//             const state = getCanvasStateDesign();
//             updateCanvasStateDesign({
//                 logo: {
//                     ...state.logo,
//                     x: mouseX - logoDragOffsetX, // Update the logo's x position
//                     y: mouseY - logoDragOffsetY, // Update the logo's y position
//                 }
//             });
        
//             canvasDrawLogo(); // Redraw the canvas
//         }
//     });

//     // Stop dragging the logo
//     canvas.addEventListener('mouseup', () => {
//         isLogoDragging = false;
//     });

//     canvas.addEventListener('mouseleave', () => {
//         isLogoDragging = false;
//     });

//     // Resize the logo with the mouse wheel
//     canvas.addEventListener('wheel', (e) => {
//         // Check if the logo is being dragged   
//         const { mouseX, mouseY } = getScaledMouseCoordinates(canvas, e);
//         const state = getCanvasStateDesign();
//         const { logo } = state;

//         if (isMouseOverLogo(mouseX, mouseY, logo)) {

//             const newScale = Math.max(0.05, logo.scale + (e.deltaY > 0 ? -0.01 : 0.01)); // Prevent scale from going below 0.05
//             // Update the logo scale in the state
//             updateCanvasStateDesign({
//                 logo: {
//                     ...state.logo,
//                     scale: newScale, // Update the logo's scale
//                 }
//             });
            
//             canvasDrawLogo(); // Redraw the canvas with the updated logo scale
//             e.preventDefault(); // Prevent default scrolling behavior
//         }
//     }, { passive: false });

// }



// export function canvasDrawLogo() { //export
//     const {logo} = getCanvasStateDesign(); // Get the current canvas state
//     const event = new CustomEvent('canvasDrawLogo', { // canvasDrawLogo
//         detail: {
//             logoImage: logo.image, // Use the logo image from the state
//             logoX: logo.x, // Use the logo x position from the state
//             logoY: logo.y, // Use the logo y position from the state
//             logoScale: logo.scale, // Use the logo scale from the state
//         }
        
//     });
//     document.dispatchEvent(event);

// }
