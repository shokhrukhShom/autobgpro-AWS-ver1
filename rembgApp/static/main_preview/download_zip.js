import {getLogo, setLogo} from './logo_properties.js';



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

                // New Code ---------------------------------------------
                // Reset shadow properties before drawing other elements
                tempCtx.shadowOffsetX = 0;
                tempCtx.shadowOffsetY = 0;
                tempCtx.shadowBlur = 0;
                tempCtx.shadowColor = 'transparent';

                // Draw header if it exists
                if (metadata.design_data.header.height > 0) {
                    tempCtx.fillStyle = metadata.design_data.header.color;
                    tempCtx.fillRect(0, 0, visibleCanvasWidth, metadata.design_data.header.height);
                }

                // Draw footer if it exists
                if (metadata.design_data.footer.height > 0) {
                    tempCtx.fillStyle = metadata.design_data.footer.color;
                    tempCtx.fillRect(
                        0, 
                        visibleCanvasHeight - metadata.design_data.footer.height, 
                        visibleCanvasWidth, 
                        metadata.design_data.footer.height
                    );
                }

                // Draw footer texts if they exist
                if (metadata.design_data.texts && metadata.design_data.texts.length > 0) {
                    metadata.design_data.texts.forEach((text) => {
                        tempCtx.font = `${text.fontSize}px ${text.fontFamily || 'Arial'}`;
                        tempCtx.fillStyle = text.color;
                        tempCtx.textAlign = 'center';
                        tempCtx.fillText(text.content, text.x, text.y);
                    });
                }

                // Draw logo if it exists
                if (metadata.design_data.logo_path) {
                    const logoImg = new Image();
                    logoImg.src = metadata.design_data.logo_path;
                    
                    logoImg.onload = () => {
                        tempCtx.save();
                        tempCtx.translate(metadata.design_data.logo_x, metadata.design_data.logo_y);
                        tempCtx.scale(metadata.design_data.logo_scale, metadata.design_data.logo_scale);
                        tempCtx.drawImage(logoImg, 0, 0);
                        tempCtx.restore();

                        // Convert canvas to base64 PNG and add to zip
                        const imageData = tempCanvas.toDataURL('image/png', 1.0);
                        const imageName = `canvas-image-${index + 1}.png`;
                        zip.file(imageName, imageData.split('base64,')[1], { base64: true });

                        // Check if all images are processed and then trigger download
                        if (index === canvases.length - 1) {
                            zip.generateAsync({ type: 'blob' }).then(function(content) {
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(content);
                                link.download = `images_${Date.now()}.zip`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            });
                        }
                    };

                } else {
                    console.log("No logo found for this canvas, proceeding without logo.");
                    // If no logo, just proceed with the export
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
                }

                // End new code ---------------------------------------------
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
