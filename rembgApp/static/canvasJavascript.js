// Function to change the background color of the entire webpage
function changeBackgroundColor(color) {
    let canvas_bg = document.getElementById("canvas");
    //document.body.style.backgroundColor = color;
    canvas_bg.style.backgroundColor = color;
}


// Implement the saveImage function to 
// Export the canvas as an image and trigger a download

// saveImage function called from canvas and "path" is passed 
function saveImage(imagePath) {
    // Get the canvas element
    const canvas = document.getElementById('canvas');

    // Convert the canvas content to a data URL (image)
    const imageData = canvas.toDataURL("image/png");

    //console.log("canvasJavascript: " + imagePath);
  
    showLoadingSpinner();
    
    console.log("save_image_edit initiated");

    // Send AJAX request
    fetch("save_image_edit", {
        
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken")  // For CSRF protection in Django
        },
        body: JSON.stringify({ 
            image: imageData,
            image_path: imagePath,
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Image saved successfully:", data);
        //backToMainBtn();
        // Reload the page after successful response
        showError("Image saved successfully","green")

        // Clear the canvas after successful save
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Reset drawing state
        if (window.disableDrawing) {
            window.disableDrawing();
        }

        // Reset brush size to default after saving
        if (window.updateCursorWidth) {
            window.updateCursorWidth(50); // Reset to default size
        }

        //window.location.reload();
        setTimeout(() => {
            window.location.href = window.location.pathname + "?nocache=" + Date.now();
        }, 500);    
        
    })
    .catch(error => {
        console.error("Error saving image:", error);
    });
}

// Function to get the CSRF token for Django (if you're using CSRF protection)
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split("; ");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].split("=");
            if (cookie[0] === name) {
                cookieValue = decodeURIComponent(cookie[1]);
                break;
            }
        }
    }
    return cookieValue;

}


