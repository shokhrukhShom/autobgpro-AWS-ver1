
function canvasEdit (givenImageSrc, originalImageSrc) {

    // Show loading spinner immediately
    showLoadingSpinner("Image loading...");
    
    

    let draw_color = ''; // set drawing color fully transparent
    let cursor_color = 'white';
    let draw_width = 50;   // Default width

    let is_drawing = false;
    let is_erasing = false; // New variable to track eraser mode by Chatgpt
    let is_enabled = false; // New flag to control drawing
    let is_restoring = false;


    //empty array to save all the path/dawring
    let restore_array = [];
    let index = -1;

    // emty array to save all path/drawing for redo
    let restore_array_redo = [];
    let index_redo = -1;

    

    const canvas = document.getElementById('canvas');
    //canvas.width = window.innerWidth - 60;
    //canvas.height = window.innerWidth - 80;

    const context = canvas.getContext("2d");
    //let start_background_color = 'rgba(255, 255, 255, 0)'; // set the background fully transparent

    // Load the background image
    const backgroundImage = new Image();

    // Make sure the canvas starts with a transparent background
    context.clearRect(0, 0, canvas.width, canvas.height);

    //chatgpt edit BG code Start 

    // Create an image object ---------> this is img source <---------
    const img = new Image();

    // Set the image source  ---------> this is img source <---------
    img.src = givenImageSrc; // Replace with the path to your PNG

    // debugging
    console.log("img src: ", img.src);

    // Once the image is loaded, adjust canvas size and draw it on the canvas
    img.onload = function() {
        // Set the canvas width to 80% of the browser window's width
        canvas.width = 800;
        
        // Maintain the aspect ratio and adjust canvas height based on image's natural dimensions
        const aspectRatio = img.height / img.width;
        canvas.height = canvas.width * aspectRatio;

        // Draw the image on the canvas
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        
    };

    // Handle image loading errors
    img.onerror = function() {
        hideLoadingSpinner();
        console.error("Failed to load image:", givenImageSrc);
        alert("Failed to load the image. Please try again.");
    };
    //chatgpt edit BG code End ------------->

    // ChatGPT Code for restore START
    // Load the original JPEG image

    // Here is original image src -------->ORIGINAL img Src <--------
    const originalImage = new Image();
    originalImage.src = originalImageSrc; // Replace with the path to your original JPEG

    // Make sure to adjust the canvas size and draw the original image when it's loaded
    originalImage.onload = function() {
        // Ensure the original image matches the canvas dimensions
        // We don't need to adjust the canvas size again, just ensure scaling

        // Draw the image on the canvas
        //context.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
        hideLoadingSpinner();
    };

    //ChatGPT code restore ENDS  <------------






    
    //function updateCursorWidth(newWidth) 
    window.updateCursorWidth = function(newWidth){
        
        draw_width = newWidth;

        if (is_erasing || is_restoring) { // "|| is_restoring" is new remove if not working
        // Define the SVG as a string
        const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${(draw_width/2) * 2}" height="${(draw_width/2) * 2}">
            <circle cx="${draw_width/2}" cy="${draw_width/2}" r="${draw_width/2}" stroke="${cursor_color}" stroke-width="1" fill="none" />
        </svg>`;

        // Encode the SVG to a Data URL
        const encodedSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

        // Set the cursor style dynamically with the Data URL
        canvas.style.cursor = `url('${encodedSvg}') ${draw_width/2} ${draw_width/2}, auto`;
        } else {
            // Reset to the default cursor (normal drawing mode)
            canvas.style.cursor = 'auto';
        }

    };
    // Call this when the page first loads to set the cursor to the initial value
    window.onload = function() {
        // Set the cursor to the initial range value on page load
        updateCursorWidth(draw_width);
    };


    //CHAT GPT END--------------------
    // Drawing enable and disable control flag


    // Enable drawing (called when "erase" or "restore" is clicked)
    
    window.enableDrawing = function() {
        is_enabled = true; // Allow drawing
        is_drawing = false;
        is_erasing = true;
        is_restoring = false; // Disable restore mode
    }

    // Disable drawing (called initially or when other buttons are clicked)
    window.disableDrawing = function() {
        is_enabled = false;
        is_drawing = false;
        is_erasing = false;
        is_restoring = false; // Disable restore mode
        canvas.style.cursor = 'auto'; // Reset cursor to default
    }

    //NEW from ChatGPT!!!!
    // Function to enable restore mode
    window.enableRestoreMode = function() {
        disableDrawing(); // Disable drawing and erasing modes
        is_restoring = true; // Enable restoring mode
        is_erasing = false; // Disable erasing mode
        
        context.globalCompositeOperation = 'source-over'; // Reset to normal drawing mode
        // Update the cursor to show the circular restore cursor
        updateCursorWidth(draw_width);
        
    
    }

    //Chat gpt Start -------

    // Function to toggle between drawing and erasing
    // Function to activate eraser mode

    window.restoreAtPosition = function(x, y) {

       
        updateCursorWidth(draw_width);

        const radius = draw_width / 2; // Use the brush size to determine the area to copy
        const scaleX = originalImage.width / canvas.width;
        const scaleY = originalImage.height / canvas.height;

        // Calculate the corresponding coordinates on the original image
        const copyX = (x - radius) * scaleX;
        const copyY = (y - radius) * scaleY;

        context.save();
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.clip();

        // Draw the corresponding section from the originalImage to the canvas
        context.drawImage(
            originalImage, 
            copyX, copyY, draw_width * scaleX, draw_width * scaleY, 
            x - radius, y - radius, draw_width, draw_width
        );

        context.restore();


    }

    // canvas.addEventListener('mousedown', function(event) {
    //changing it to get correct x and y position of mouse
    canvas.addEventListener('mousedown', function(event) {
            
            updateCursorWidth(draw_width);
            //New code
            const rect = canvas.getBoundingClientRect(); // Get the bounding rectangle of the canvas
            const x = event.clientX - rect.left; // Adjust x coordinate
            const y = event.clientY - rect.top;  // Adjust y coordinate
            //new code ends

        if (is_restoring ) { // Check if restoring mode is enabled
            
            //const x = event.clientX - canvas.offsetLeft;
            //const y = event.clientY - canvas.offsetTop;

            restoreAtPosition(x, y);
            
        }
        else if (is_erasing) { // Check if erasing mode is enabled

            //const x = event.clientX - canvas.offsetLeft;
            //const y = event.clientY - canvas.offsetTop;

            startErasingAtPosition (x, y);
        }  
    });



    // Function to start erasing at a position (similar to drawing)
    window.startErasingAtPosition = function (x, y) {
        
        updateCursorWidth(draw_width);

        //updateCursorWidth(draw_width);
        context.save();
        context.globalCompositeOperation = 'destination-out'; // Set to erase

        context.beginPath();
        context.arc(x, y, draw_width / 2, 0, Math.PI * 2);
        //context.fillStyle = 'rgba(255, 255, 255, 1)'; // Transparent erasing color
        context.fill();
        
        // Optional: Reset the line width to avoid extra strokes making it appear bigger
        context.lineWidth = 1;
        context.stroke();

        context.restore();
    }



     window.useEraser = function(){
        enableDrawing(); // Enable drawing for erase mode NEW
        is_erasing = true; // Set erasing mode
        is_restoring = false; //turn off restore mode
        context.globalCompositeOperation = 'destination-out'; // Set to erase
        //draw_color = 'rgba(255, 255, 255, 1)'; // Set the color to fully transparent
        updateCursorWidth(draw_width);
        
    }


    window.useRestore = function (x, y) {
        //resore the image code here
        updateCursorWidth(draw_width); // Update the cursor to reflect the eraser mode
        disableDrawing();
        enableRestoreMode(); 
    }
    //Chat gpt End -------


    //start drawing
    canvas.addEventListener('touchstart', start, false);
    canvas.addEventListener('touchmove', draw, false);

    canvas.addEventListener('mousedown', start, false);
    canvas.addEventListener('mousemove', draw, false);

    canvas.addEventListener('touchend', stop, false);
    canvas.addEventListener('mouseup', stop, false);
    canvas.addEventListener('mouseout', stop, false);



    // start drawing
    function start(event) {
        if (!is_enabled) return; // Prevent drawing if not enabled
        is_drawing = true;

        // new code
        const rect = canvas.getBoundingClientRect(); // Get the bounding rectangle of the canvas
        const x = event.clientX - rect.left; // Adjust x coordinate
        const y = event.clientY - rect.top;  // Adjust y coordinate
        //new code ends

        context.beginPath();
        context.moveTo( x,y
            //event.clientX - canvas.offsetLeft, 
            //event.clientY - canvas.offsetTop
        );
        event.preventDefault();
    }

    // while drawing
    function draw(event) {
        if (!is_enabled || !is_drawing) return; // Prevent drawing if not enabled
            
            // New code Start
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left; // Adjusted x-coordinate
            const y = event.clientY - rect.top;  // Adjusted y-coordinate
            // New code ends
        
            context.lineTo(x,y
                //event.clientX - canvas.offsetLeft, 
                //event.clientY - canvas.offsetTop
            );
            

            context.strokeStyle = is_erasing ? 'rgba(255, 255, 255, 1)' : draw_color; // Change stroke color based on erasing
            context.strokeStyle = draw_color;
            context.lineWidth = draw_width;  
            context.lineCap = "round";
            context.lineJoin = "round";
            context.stroke();
        
    }

    // stop drawing
    function stop(event) {
        if (is_drawing){
            context.stroke();
            context.closePath();
            is_drawing = false;
        }
        event.preventDefault();

        if (event.type != 'mouseout') {
            restore_array.push(context.getImageData(0, 0, canvas.width, canvas.height));
            index += 1;
            //console.log(restore_array);
        }
    }


    window.clear_canvas = function() {

        // Reset to normal drawing mode
        context.globalCompositeOperation = 'source-over'; 
        
        // Clear the entire canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Redraw the original PNG image
        context.drawImage(img, 0, 0, canvas.width, canvas.height);   

        //resetting array and index
        restore_array = [];
        index = -1;

        //resetting array redo and index redo
        restore_array_redo = [];
        index_redo = -1;
        
        // Reset the cursor back to the default system cursor (e.g., arrow)
        canvas.style.cursor = 'default';  // This resets the cursor to normal
        disableDrawing(); // Disable drawing after clicking clear
    }

    window.undo_last = function () {
        // if index is less then 0, clear the canvas
        // TODO: save only last 10 edits
        if (index <= 0) {
            clear_canvas();
        } else {

            //save to redo_last
            index_redo += 1;
            let lastArray = restore_array[restore_array.length - 1];
            restore_array_redo.push(lastArray);
            console.log(restore_array_redo);
            

            //delete/pop last draw/path from array
            index -= 1;
            restore_array.pop();
            context.putImageData(restore_array[index], 0, 0);
        }
    }

    window.redo_last = function () { 
        // check if index_redo is 0  
        //and update the undo_last
        if (index_redo < 0) {
            //clear_canvas(); // not sure this is correct
            console.log("empty index_redo: " + index_redo);
            console.log("restore_array_redo: "+ restore_array_redo)
        } else {
            console.log("index_redo is equal/bigger that 0: " + index_redo);
            console.log("restore_array_redo: "+ restore_array_redo);
            //update the canvas
            context.putImageData(restore_array_redo[index_redo], 0, 0);

            //update restore_array and index to add redo drawing
            restore_array.push(context.getImageData(0, 0, canvas.width, canvas.height));
            index += 1;

            //delete/pop last draw/path from array
            index_redo -= 1;
            restore_array_redo.pop();
            
        };
    };


    // when saveImage button clicked, call 
    // document.getElementById('saveImage').addEventListener('click', function(){

    //     let modifiedGivenImageSrc = givenImageSrc.replace("http://127.0.0.1:8000/", "").replace(/\?t=.*$/, "");
        
    //     //call a save image function
    //     saveImage(modifiedGivenImageSrc);
        

    // });
    const BASE_URL = window.location.origin + "/";

    document.getElementById('saveImage').addEventListener('click', function () {
        let modifiedGivenImageSrc = givenImageSrc
            .replace(BASE_URL, "")
            .replace(/\?t=.*$/, "");

        
        saveImage(modifiedGivenImageSrc);

        // reset image sources 
        givenImageSrc = null
        originalImageSrc = null
        
    });





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


};



