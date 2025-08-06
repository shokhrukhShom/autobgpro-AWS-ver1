document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Loaded");


    // Ensure the SaveButton exists before adding event listener
    const saveButton = document.getElementById('SaveButton');
    if (!saveButton) {
        console.error("SaveButton not found in the DOM");
        return;
    }

    saveButton.addEventListener('click', async function(event) {
        event.preventDefault();
        console.log("SaveButton clicked!!!: ===>>>");
        
        if (!fileArray || fileArray.length === 0) {
            console.error("No files to process");
            //alert("Please select files first");
            showError("No image file found. Please, add image(s)", "red");

            return;
        }

        // Validation constraints
        const MAX_FILES = 20;
        const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
        const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 30MB

        // Validate file count
        if (fileArray.length > MAX_FILES) {
            //alert(`Maximum ${MAX_FILES} files allowed per upload (you selected ${fileArray.length})`);
            showError(`Maximum ${MAX_FILES} files allowed per upload (you selected ${fileArray.length})`, "red");
            return;
        }

         // In your click handler:
        let totalSize = 0;
        for (const file of fileArray) {
            totalSize += file.size;
            if (file.size > MAX_FILE_SIZE) {
                //alert(`File ${file.name} is too large (max ${MAX_FILE_SIZE/1024/1024}MB)`);
                showError(`File ${file.name} is too large (max ${MAX_FILE_SIZE/1024/1024}MB)`, "red");
                return;
            }
        }
        if (totalSize > MAX_TOTAL_SIZE) {
            //alert(`Total upload size too large (max ${MAX_TOTAL_SIZE/1024/1024}MB)`);
            showError(`Total upload size too large (max ${MAX_TOTAL_SIZE/1024/1024}MB)`, "red")
            return;
        }

        console.log("File sizes:", fileArray.map(f => f.size));
        console.log("Total size:", totalSize);

        console.log("fileArray from handleImg.js:", fileArray.map(file => file.name));
        
        let formData = new FormData();
        fileArray.forEach(file => {
            formData.append('images', file);
        });

        try {
            showLoadingSpinner();
            
            const response = await fetch('/imageProcessing', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                if (response.status === 413) {
                    //alert('File size too large. Please reduce image sizes or upload fewer images at once.');
                    showError("File size too large. Please reduce image sizes or upload fewer images at once.", "red");
                } 
                else if (response.status === 403) { 
                    showError("Your Subscription is expired or You've reached your monthly limit", "red");
                    }
                else {
                    alert('An error occurred: ' + response.statusText);
                }
                return;
            }

            const result = await response.json();
            console.log(result["Backend message"]);
            
            if (result.redirect_url) {
                window.location.href = result.redirect_url;
            }

        } catch (error) {
            console.error('Unexpected error:', error);
            alert(`Unexpected error: ${error.message}`);
        } finally {
            // Remove spinner when done (whether success or error)
            const spinner = document.getElementById('spinner-container');
            if (spinner) {
                spinner.remove();
            }
        }
    });
});

// Single CSRF token function
function getCSRFToken() {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
    if (csrfToken) {
        return csrfToken.value;
    }
    console.error("CSRF token not found in the document.");
    return '';
}

function showLoadingSpinner() {
    // Remove existing spinner if present
    const existingSpinner = document.getElementById('spinner-container');
    if (existingSpinner) {
        existingSpinner.remove();
    }

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
    spinnerContainer.style.flexDirection = "column";
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
    message.textContent = "   Processing... Please do not reload the page. It may take few minutes";
    message.style.color = "white";
    message.style.marginTop = "20px";
    message.style.fontSize = "16px";
    message.style.textAlign = "center";
    message.style.maxWidth = "300px";
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
}


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