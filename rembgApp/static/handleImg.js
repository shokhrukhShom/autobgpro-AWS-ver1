// When website loaded, Load DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Loaded");

    // call all your functions here e.g.: myFunction();
 

})

    document.getElementById('SaveButton').addEventListener('click', async function(event) {
        event.preventDefault(); // Don't submit the form and roload the page
        console.log("SaveButton clicked!!!: ===>>>")
        
        console.log("fileArray from handleImg.js:", fileArray.map(file => file.name))
        
        
        let formData = new FormData();
        //let fileInput = document.getElementById('fileInput');
        //let files = fileInput.files;
        let fileArrays = fileArray;
        
        fileArrays.forEach(file => {
            formData.append('images', file);
        });

    try {
        showLoadingSpinner();
        
        const response = await fetch('/imageProcessing', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCSRFToken()  // You may need to add a function to get CSRF token
            }
        });

        if (!response.ok) {
            // Handle non-2xx HTTP responses
            const errorText = await response.text();  // Read the response as text
            console.error('Server error response:', errorText);
            //alert('An error occurred: ' + response.statusText);
            return;
        }

        const result = await response.json();  // Safely parse JSON if response is ok

        console.log(result["Backend message"]);
        // Redirect to the URL provided in the JSON response
        if (result.redirect_url) {
            window.location.href = result.redirect_url;
        }

    } catch (error) {
        // Handle network errors or unexpected issues
        console.error('Unexpected error:', error.message);
        alert(`Unexpected error: ${error.message}`);
    }
    }); // listerer end paranthesis
    //New code ends


    // Function to get CSRF token (Django-specific)
    function getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    function getCSRFToken() {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfToken) {
            return csrfToken.value;
        } else {
            console.error("CSRF token not found in the document.");
            return '';
        }
    }


// Start Loading spinner
// just add it before fetch function "showLoadingSpinner();"

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
    message.textContent = "Processing... Please do not reload the page. It may take a few minutes";
    message.style.color = "white";
    message.style.marginTop = "10px";
    message.style.fontSize = "16px";
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


// END Loading spinner