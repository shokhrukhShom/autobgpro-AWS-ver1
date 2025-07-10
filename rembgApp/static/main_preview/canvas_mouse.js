import { download_zip } from "./download_zip.js";

//import { headerBarColor, headerBarHeight } from "./header.js"; //setHeaderBarValues
//import {updateHeaderBarColor} from "./header.js"; // todo : no use for this 
import { fetchHeaderMetadata, setMetaValues, getMetaValues, headerBarColor, headerBarHeight, footerHeight,footerColor, footerTexts} from "./metadata_fetch.js";

// import { footerColor, footerHeight, footerTexts} from "./footer.js";

import { initializeFooter } from "./footer.js";
//import {canvasRedrawFooter} from "./footer.js"; //dont need this

import { logoImage, logoX, logoY, logoScale } from "./logo_properties.js";
import { initializeLogo } from "./logo_properties.js";
import { canvasDrawLogo } from "./logo_properties.js";
import { getLogo, setLogo } from "./logo_properties.js";


fetchHeaderMetadata(project_id);


//  function to draw a border around the image
function drawImageBorder(ctx, imageX, imageY, imageScale, img) {
    const imgWidth = img.naturalWidth * imageScale;
    const imgHeight = img.naturalHeight * imageScale;

    // Set border properties
    ctx.strokeStyle = 'lightgray'; // Border color
    ctx.lineWidth = 2; // Border thickness

    // Draw the border around the image
    ctx.strokeRect(
        imageX - imgWidth / 2, // X position
        imageY - imgHeight / 2, // Y position
        imgWidth, // Width
        imgHeight // Height
    );
}

export let showBorder = false;

// Define drawCanvas at the module level
function drawCanvas(ctx, img, background, imageX, imageY, imageScale, shadowOffsetY, shadowBlur, canvas, imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, logoScale) {

    // Draw the background first
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Shadow 
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = shadowOffsetY; 
    ctx.shadowBlur = shadowBlur;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';

    // Draw the image with scale and position
    const imgWidth = img.naturalWidth * imageScale;
    const imgHeight = img.naturalHeight * imageScale;

    ctx.drawImage(
        img,
        imageX - imgWidth / 2,
        imageY - imgHeight / 2,
        imgWidth,
        imgHeight
    );
    ctx.save();
    ctx.restore();


    // Collect each metadata values 
    const metadata = {
        project_id: project_id,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        imagePath:  imagePath, // Save absolute path
        backgroundPath: currentBg, // Save absolute path
        shadowOffsetY: shadowOffsetY,
        shadowBlur: shadowBlur,
        shadowColor: 'rgba(0, 0, 0, 0.7)',
        imageX: imageX,
        imageY: imageY,
        imageScale: imageScale,
        
        design_data: {  // Add this new structure
            header: {
                height: headerBarHeight,
                color: headerBarColor,
                opacity: "1"
            },
            footer: {
                height: footerHeight,
                color: footerColor,
                opacity: "1"
            },
            texts: [...footerTexts],  // Create a copy of the array

            logo_x: logoX,
            logo_y: logoY,
            logo_scale: logoScale,
            //logo_path: logoImage.src // .src

        }
        
    };

    metadataMap.set(canvas, metadata);

    // Draw the image border if showBorder is true
    if (showBorder === true) {
        drawImageBorder(ctx, imageX, imageY, imageScale, img);
    }

    // Draw the transparent header bar
    if (headerBarHeight > 0) {
        //console.log("headerBarHeight > 0 is true. Bar Height: " + headerBarHeight);
        //console.log("Drawing header bar: ", headerBarHeight, headerBarColor);
        // Reset shadow properties before drawing the header
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        ctx.fillStyle = headerBarColor;
        ctx.fillRect(0, 0,  canvas.width, headerBarHeight);
    }

    if (footerHeight) {
        //console.log("footer height: ", footerHeight);
        // Draw footer 
        ctx.fillStyle = footerColor;
        ctx.fillRect(0, canvas.height - footerHeight, canvas.width, footerHeight);

    }
    
    // Draw each footer text
    if (footerTexts != 0){
        //console.log("footer text", footerTexts);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        footerTexts.forEach((text) => {
            ctx.font = `${text.fontSize}px Arial`;
            ctx.fillStyle = text.color;
            ctx.font = `${text.fontSize}px ${text.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.fillText(text.content, text.x, text.y);
        })
    } 
    
    // Draw the uploaded logo image if it's loaded
    if (logoImage && logoImage.src) { //&& logoImage.src

        
        console.log("Drawing logo at:", logoX, logoY, "with scale:", logoScale, "logo src:", logoImage.src);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        ctx.save();
        ctx.translate(logoX, logoY); // Set position of the logo
        ctx.scale(logoScale, logoScale); // Set scale of the logo
        ctx.drawImage(logoImage, 0, 0); // Draw the logo image
        ctx.restore();
    }


}

function redrawCanvas(ctx, img, background, imageX, imageY, imageScale, shadowOffsetY, shadowBlur, canvas, imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, logoScale) {
    drawCanvas(ctx, img, background, imageX, imageY, imageScale, shadowOffsetY, shadowBlur, canvas, imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, logoScale);
}



document.addEventListener("DOMContentLoaded", async () => {

    const canvases = document.querySelectorAll(".rembg-canvas");
    const images = document.querySelectorAll(".png-img");

    // Ensure we have canvases and images to work with
    if (canvases.length === 0 || images.length === 0) {
        console.error("No canvases or images found");
        return;
    }

    // getting slider value by id
    const shadowOffsetYInput = document.getElementById('shadow-offset-y');
    const shadowBlurInput = document.getElementById('shadow-blur');
    const offsetYValue = document.getElementById('offset-y-value');
    const blurValue = document.getElementById('blur-value');
    

    // assigning shadow nav button
    const shadowBtn = document.getElementById('shadowBtn');
    // assigning shadow cancel button
    const cancelShadow = document.getElementById('cancelShadow');
    

    let isDragging = false;

    // Function to fetch metadata
    async function fetchMetadata(project_id, image_path) {
        try {
            const response = await fetch(`/get_metadata/${project_id}/`);
            if (!response.ok) return null; // If metadata doesn't exist, return null 

            const metadataList = await response.json(); // Now expecting an array

            if (!metadataList.length) return null; // If no metadata, do nothing

            return metadataList; // Return all metadata related to the project
            
        } catch (error) {
            console.error("Error fetching metadata:", error);
            return null;
        }
    }
    
    // commenting out old code
    let metadataList = await fetchMetadata(project_id);  // Get metadata array
    // For some reason png images is not sorted. following code ensurs sorting by 0.png 1.png 2.png... etc. 
    //Sort metadataList by PNG Name
    if(metadataList){
        metadataList.sort((a, b) => {
            const nameA = parseInt(a.image_path.match(/(\d+)\.png$/)[1], 10);
            const nameB = parseInt(b.image_path.match(/(\d+)\.png$/)[1], 10);
            return nameA - nameB;
        });
    }

    // ---------Canvas redraw start
    // Listen for the custom event to redraw the canvas
    canvases.forEach(async (canvas, index) => {
        const ctx = canvas.getContext("2d");
        const img = new Image();
        const background = new Image();

        initializeFooter(canvas, ctx); // Initialize footer functionality for this canvas
        initializeLogo(canvas);// Initialize Logo functionality for this canvas

        // commenting out old code
        // Load the rembg image from its path
        img.src = images[index].dataset.path;
        let imagePath = img.src; 
        
        

        // Load a background image (replace with your background image path)
        //if statement for default bg image "patform.jpg" if no bg selected yet
        if (currentBg == "None"){
            background.src = '/media/bg-templates/patform.jpg';
        } else {
            background.src = currentBg; 
        }

        // Error Handling for Image Loading
        img.onerror = () => {
            console.error("Failed to load image:", img.src);
        };
        
        background.onerror = () => {
            console.error("Failed to load background:", background.src);
        };

        // Synchronize both image loads
        let imagesLoaded = 0;
        // initializing properties
        let imageX, imageY, imageScale;
        let shadowOffsetY = 0;
        let shadowBlur = 0;
        // *** Declare dragOffsetX and dragOffsetY ***
        let dragOffsetX = 0;  
        let dragOffsetY = 0; 


        // High resolution
        function setHighResolutionCanvas(canvas, width, height, displayWidth, displayHeight) {
            // Set logical resolution
            canvas.width = width;
            canvas.height = height;

            // Set display size via CSS
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;
        }

        function calculateDefaultScale(img, canvas) {
            const scaleX = canvas.width / img.naturalWidth;
            const scaleY = canvas.height / img.naturalHeight;
            return Math.min(scaleX, scaleY);
        }

        // Prevent scrolling when using the mouse wheel on the canvas
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
        }, { passive: false });


        async function checkImagesLoaded () {
            imagesLoaded++;
            if (imagesLoaded === 2) {
                // Ensure both images are fully loaded
                if (!img.complete || !background.complete) {
                    console.error("Images not fully loaded");
                    return;
                }

                // Set the high-resolution canvas
                const displayWidth = 600; // Display size in the browser
                const displayHeight = 400; // Adjust as needed
                const highResolutionFactor = 2; // Scale factor for high resolution

                setHighResolutionCanvas(
                    canvas,
                    displayWidth * highResolutionFactor, // Logical width
                    displayHeight * highResolutionFactor, // Logical height
                    displayWidth, // Display width
                    displayHeight // Display height
                );


                // moved it to the bottom lower
                // const scaleFactor = highResolutionFactor;
                imageScale = calculateDefaultScale(img, canvas);
                // Center the image
                imageX = canvas.width / 2;
                imageY = canvas.height / 2;
                
                
                // Ensure we have corresponding metadata for this image
                const metadata = metadataList ? metadataList[index] : null;
            
                if (metadata) {
                    //console.log(`Applying metadata to image ${index}:`, metadata);
            
                    // Apply saved properties from database that saved in metadata
                    imageX = metadata.image_x ?? canvas.width / 2;
                    imageY = metadata.image_y ?? canvas.height / 2;
                    imageScale = metadata.image_scale ?? 1;
                    shadowOffsetY = metadata.shadow_offset_y ?? 0;
                    shadowBlur = metadata.shadow_blur ?? 0;
            
                    shadowOffsetYInput.value = shadowOffsetY;
                    shadowBlurInput.value = shadowBlur;
                    offsetYValue.textContent = shadowOffsetY;
                    blurValue.textContent = shadowBlur;     
                    
                    // new code for logo -------------------------
                    if (metadata.logo_path) {
                        console.log("Loading logo from metadata:", metadata.logo_path);
                        const logoImg = new Image();
                        logoImg.src = metadata.logo_path;
                        setLogo(
                            logoImg,
                            metadata.logo_x || 100,
                            metadata.logo_y || 100,
                            metadata.logo_scale || 0.1
                        );
                        
                        logoImg.onload = function() {
                            const logo = getLogo();
                            drawCanvas(ctx, img, background, imageX, imageY, imageScale, 
                                shadowOffsetY, shadowBlur, canvas, imagePath, currentBg, 
                                project_id, metadataMap, headerBarColor, headerBarHeight, 
                                footerColor, footerHeight, footerTexts, 
                                logo.image, logo.x, logo.y, logo.scale);
                        };
                    }
                    // new code for logo ends -------------------------


                   
                    // new code for header and footer  
                    //console.log(metadata.project_id + " | heade height: " + metadata.header_height + " | header color: " + metadata.header_color + " | Opacity: " + metadata.header_opacity);
                    // Setting metadata from sqlite database. setHeaderValues function called from header_encapsulation.js
                    setMetaValues(
                        metadata.header_height, 
                        metadata.header_color, 
                        metadata.header_opacity, 
                        metadata.footer_color, 
                        metadata.footer_height,
                        metadata.texts,
                        metadata.logo_path,
                        metadata.logo_x,
                        metadata.logo_y,
                        metadata.logo_scale
                    );
                    //console.log("metadata for logo image: ", metadata.logo_path, metadata.logo_x, metadata.logo_y, metadata.logo_scale)
                    // new code ends

                }
               

                // Draw the canvas content
                drawCanvas(ctx, img, background, imageX, imageY, imageScale, shadowOffsetY, shadowBlur, canvas, imagePath, 
                    currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, logoScale);
                
                


                // Listen for the custom event to redraw the canvas for footer updates
                document.addEventListener('canvasRedrawFooter', (event) => {
                    const { footerHeight, footerColor, footerTexts } = event.detail;
                    //console.log("canvasRedrawFooter activated" );
                    drawCanvas(ctx, img, background, imageX, imageY, imageScale, shadowOffsetY, shadowBlur, canvas, imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, 
                        footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, logoScale);
                });

                // Listen for the custom event to redraw the canvas for footer updates
                document.addEventListener('canvasDrawLogo', (event) => {
                    const { logoImage, logoX, logoY, logoScale } = event.detail;
                    //console.log("canvasDrawLogo activated" );
                    drawCanvas(ctx, img, background, imageX, imageY, imageScale, shadowOffsetY, shadowBlur, canvas, imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, 
                        footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, logoScale);
                });



            };
        };

        // Add onload handlers
        background.onload = checkImagesLoaded;
        img.onload = checkImagesLoaded;

        function isMouseOverImage(mouseX, mouseY) {
            const imgWidth = img.naturalWidth * imageScale;
            const imgHeight = img.naturalHeight * imageScale;
        
            // Calculate the bounds of the image (centered at imageX, imageY)
            const imgLeft = imageX - imgWidth / 2;
            const imgRight = imageX + imgWidth / 2;
            const imgTop = imageY - imgHeight / 2;
            const imgBottom = imageY + imgHeight / 2;
        
            // Check if the mouse is within the image's bounds
            return (
                mouseX >= imgLeft &&
                mouseX <= imgRight &&
                mouseY >= imgTop &&
                mouseY <= imgBottom
            );
        }

        function getScaledMouseCoordinates(canvas, e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;  // Logical width / Display width
            const scaleY = canvas.height / rect.height; // Logical height / Display height
        
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
        
            return { mouseX, mouseY };
        }

        showBorder = false;

        canvas.addEventListener('mousedown', (e) => {
            
            const { mouseX, mouseY } = getScaledMouseCoordinates(canvas, e);

            if (isMouseOverImage(mouseX, mouseY)) { 
                isDragging = true;
                showBorder = true;

                dragOffsetX = mouseX - imageX;
                dragOffsetY = mouseY - imageY;
                // Redraw the canvas with the border visible
                redrawCanvas(ctx, img, background, imageX, 
                    imageY, imageScale, shadowOffsetY, shadowBlur, canvas, 
                    imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, 
                    footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, 
                    logoScale);
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                // new code getScaledMouseCoordinates()...
                const { mouseX, mouseY } = getScaledMouseCoordinates(canvas, e);
                imageX = mouseX - dragOffsetX;
                imageY = mouseY - dragOffsetY;
                
                showBorder = true;

                redrawCanvas(ctx, img, background, imageX, 
                    imageY, imageScale, shadowOffsetY, shadowBlur, canvas, 
                    imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, 
                    footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, 
                    logoScale);
            }
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            showBorder = false;
            // Redraw the canvas without the border
            redrawCanvas(ctx, img, background, imageX, 
                imageY, imageScale, shadowOffsetY, shadowBlur, canvas, 
                imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, 
                footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, 
                logoScale); 
        });

        canvas.addEventListener('mouseleave', () => {
            isDragging = false;
        });


        // Scroll to resize the image
        // Resize the PNG image dynamically with the mouse wheel
        canvas.addEventListener('wheel', (e) => {

            const { mouseX, mouseY } = getScaledMouseCoordinates(canvas, e);
            if (isMouseOverImage(mouseX, mouseY)) { 
                const delta = e.deltaY > 0 ? -0.02 : 0.02;
                imageScale = Math.max(0.1, imageScale + delta); // Ensure scale doesn't go below 0.1
                
                showBorder = true;
                redrawCanvas(ctx, img, background, imageX, 
                            imageY, imageScale, shadowOffsetY, shadowBlur, canvas, 
                            imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, 
                            footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, 
                            logoScale);
                e.preventDefault(); // Prevent default scrolling behavior

                setTimeout(() => {
                    showBorder = false;
                    redrawCanvas(ctx, img, background, imageX, 
                            imageY, imageScale, shadowOffsetY, shadowBlur, canvas, 
                            imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, 
                            footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, 
                            logoScale);
                }, 400);
            }
        }, { passive: false });


        // END scale and position function --------


        // Update shadow properties dynamically
        shadowOffsetYInput.addEventListener('input', (e) => {
            shadowOffsetY = parseInt(e.target.value, 10);
            offsetYValue.textContent = shadowOffsetY;

            redrawCanvas(ctx, img, background, imageX, 
                imageY, imageScale, shadowOffsetY, shadowBlur, canvas, 
                imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, 
                footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, 
                logoScale);
        });

        shadowBlurInput.addEventListener('input', (e) => {
            shadowBlur = parseInt(e.target.value, 10);
            blurValue.textContent = shadowBlur;
            
            redrawCanvas(ctx, img, background, imageX, 
                imageY, imageScale, shadowOffsetY, shadowBlur, canvas, 
                imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, 
                footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, 
                logoScale);
        });

        // Apply shadow when botton clicked
        shadowBtn.addEventListener('click', function(){
            console.log("shadowBtn clicked!")
            shadowOffsetY = shadowOffsetYInput.value; // Default value
            shadowBlur = shadowBlurInput.value;    // Default value
            redrawCanvas(ctx, img, background, imageX, 
                imageY, imageScale, shadowOffsetY, shadowBlur, canvas, 
                imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, 
                footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, 
                logoScale);
        })

        //----------------

        cancelShadow.addEventListener('click', function(){
            console.log('cancelShadow btn clicked!')
            //updating slider to 0
            shadowOffsetYInput.value = 0;
            shadowBlurInput.value = 0;

            // updating visual to 0
            offsetYValue.textContent = 0;
            blurValue.textContent = 0;

            shadowOffsetY = shadowOffsetYInput.value; // Default value
            shadowBlur = shadowBlurInput.value;    // Default value
            redrawCanvas(ctx, img, background, imageX, 
                imageY, imageScale, shadowOffsetY, shadowBlur, canvas, 
                imagePath, currentBg, project_id, metadataMap, headerBarColor, headerBarHeight, 
                footerColor, footerHeight, footerTexts, logoImage, logoX, logoY, 
                logoScale);
        });

        // Listen for the custom event to redraw the canvas
        document.addEventListener('canvasRedraw', (event) => {
            const { headerBarColor, headerBarHeight } = event.detail;
            drawCanvas(ctx, img, background, imageX, imageY, imageScale, 
                shadowOffsetY, shadowBlur, canvas, imagePath, currentBg, project_id,
                metadataMap, headerBarColor, headerBarHeight, footerColor, footerHeight, footerTexts, 
                logoImage, logoX, logoY, logoScale);
        });

    });
    
    // Download the images ----------------------
    
    // Event listener Click the Export button run download_zip function
    document.getElementById('exportImages').addEventListener('click', () => {
        console.log("exportImages initiated next download_zip function");
        download_zip();  
    });

    // Add this near your other event listeners
    document.addEventListener('saveLogoMetadata', (event) => {
        const { logo_path, logo_x, logo_y, logo_scale } = event.detail;
        
        // Update the metadata map
        metadataMap.forEach((metadata, canvas) => {
            metadata.design_data.logo_path = logo_path;
            metadata.design_data.logo_x = logo_x;
            metadata.design_data.logo_y = logo_y;
            metadata.design_data.logo_scale = logo_scale;
        });

        // Optionally: Save to server immediately
        // You can call your save_metadata API here if you want real-time saving
    });


});



export {drawCanvas};
export {redrawCanvas};
