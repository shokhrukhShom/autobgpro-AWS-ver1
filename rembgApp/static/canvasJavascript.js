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
  
    showLoadingSpinner("Saving image...");
    
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
        hideLoadingSpinner() 
        // Clear the canvas after successful save
        
        
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


function showLoadingSpinner(textMessage) {
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
        message.textContent = textMessage; //"Processing... Please do not reload the page.";
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
