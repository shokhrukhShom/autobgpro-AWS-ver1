

function download_zip() {
    const canvases = document.querySelectorAll(".rembg-canvas");
    const images = document.querySelectorAll(".png-img");

    const zip = new JSZip();  // Create a new zip file

    console.log('download btn clicked - download_zip');

    canvases.forEach((canvas, index) => {
        let imageScale, 
            imageX, 
            imageY, 
            shadowOffsetX, 
            shadowOffsetY, 
            shadowBlur, 
            imagePath;
            

        let finalMetadataArray = Array.from(metadataMap.values());
        let metadata = finalMetadataArray[index];

        if (metadata) {
            imageScale = metadata.imageScale;
            imageX = metadata.imageX;
            imageY = metadata.imageY;
            shadowOffsetX = metadata.shadowOffsetX;
            shadowOffsetY = metadata.shadowOffsetY;
            shadowBlur = metadata.shadowBlur;
            imagePath = metadata.imagePath;
        }

        

        const visibleCanvasWidth = canvas.width;
        const visibleCanvasHeight = canvas.height;

        // Create a temporary canvas for high-resolution export
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // Set temporary canvas dimensions to the original image resolution
        tempCanvas.width = visibleCanvasWidth;
        tempCanvas.height = visibleCanvasHeight;

        // Redraw the background
        const background = new Image();

        if (currentBg !== "None") {
            background.src = currentBg;
        } else {
            background.src = '/media/bg-templates/patform.jpg';
        }

        //Synchronize drawing with background load
        background.onload = () => {
            // Draw the background image
            tempCtx.drawImage(background, 0, 0, visibleCanvasWidth, visibleCanvasHeight);

            // Now load the image (PNG) dynamically for each canvas
            const img = new Image();
            img.src = images[index].dataset.path; // Assuming this holds the PNG image path

            img.onload = () => {
                // Calculate the scaled PNG dimensions
                const imgWidth = img.naturalWidth * imageScale;
                const imgHeight = img.naturalHeight * imageScale;

                // Set the shadow properties
                tempCtx.shadowOffsetX = 0;
                tempCtx.shadowOffsetY = shadowOffsetY;
                tempCtx.shadowBlur = shadowBlur;
                tempCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';


                // Draw the PNG image on top of the background
                tempCtx.drawImage(
                    img,
                    imageX - (imgWidth / 2),
                    imageY - (imgHeight / 2),
                    imgWidth,
                    imgHeight
                );

                // Convert canvas to base64 PNG
                const imageData = tempCanvas.toDataURL('image/png', 1.0); // Maximum quality

                // Add the image to the zip file
                const imageName = `canvas-image-${index + 1}.png`; // Unique file name for each image
                zip.file(imageName, imageData.split('base64,')[1], { base64: true });

                // Check if all images are processed and then trigger download
                if (index === canvases.length - 1) {
                    zip.generateAsync({ type: 'blob' }).then(function(content) {
                        // Download the zip file
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(content);
                        link.download = `images_${Date.now()}.zip`; // Name of the zip file
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    });
                }
            };

            // In case the image fails to load, handle the error
            img.onerror = () => {
                console.error('Image failed to load');
            };
        };
    });
}


// Export the function
export { download_zip };
