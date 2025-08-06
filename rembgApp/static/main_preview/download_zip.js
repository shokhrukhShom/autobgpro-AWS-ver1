function download_zip() {
    const canvases = document.querySelectorAll(".rembg-canvas");
    const images = document.querySelectorAll(".png-img");
    const zip = new JSZip();

    console.log('download btn clicked - download_zip');

    // Track completed canvases
    let completedCanvases = 0;

    canvases.forEach((canvas, index) => {
        let finalMetadataArray = Array.from(metadataMap.values());
        let metadata = finalMetadataArray[index];
        console.log("Metadata download_zip: ", metadata);

        if (!metadata) {
            console.error('No metadata found for canvas', index);
            return;
        }

        // Extract design data with defaults
        const designData = metadata.design_data || {};
        const header = designData.header || { height: 0, color: '#000000' };
        const footer = designData.footer || { height: 0, color: '#000000' };
        const texts = designData.texts || [];
        const logo = {
            path: designData.logo_path,
            scale: designData.logo_scale || 1,
            x: designData.logo_x || 0,
            y: designData.logo_y || 0
        };

        const visibleCanvasWidth = canvas.width;
        const visibleCanvasHeight = canvas.height;

        // Create temporary canvas
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = visibleCanvasWidth;
        tempCanvas.height = visibleCanvasHeight;

        // Load background
        const background = new Image();
        background.src = currentBg !== "None" ? currentBg : '/media/bg-templates/patform.jpg';

        background.onload = () => {
            // Draw background
            tempCtx.drawImage(background, 0, 0, visibleCanvasWidth, visibleCanvasHeight);

            // Draw header if it exists
            if (header.height > 0) {
                tempCtx.fillStyle = header.color;
                tempCtx.globalAlpha = header.opacity || 1;
                tempCtx.fillRect(0, 0, visibleCanvasWidth, header.height);
                tempCtx.globalAlpha = 1;
            }

            // Load main image
            const img = new Image();
            img.src = images[index].dataset.path;

            img.onload = () => {
                // Calculate scaled dimensions
                const imgWidth = img.naturalWidth * metadata.imageScale;
                const imgHeight = img.naturalHeight * metadata.imageScale;

                // Set shadow properties
                tempCtx.shadowOffsetX = 0;
                tempCtx.shadowOffsetY = metadata.shadowOffsetY || 0;
                tempCtx.shadowBlur = metadata.shadowBlur || 0;
                tempCtx.shadowColor = metadata.shadowColor || 'rgba(0, 0, 0, 0.7)';

                // Draw main image
                tempCtx.drawImage(
                    img,
                    metadata.imageX - (imgWidth / 2),
                    metadata.imageY - (imgHeight / 2),
                    imgWidth,
                    imgHeight
                );

                // Reset shadow
                tempCtx.shadowOffsetX = 0;
                tempCtx.shadowOffsetY = 0;
                tempCtx.shadowBlur = 0;
                tempCtx.shadowColor = 'transparent';

                // Draw footer if it exists
                if (footer.height > 0) {
                    tempCtx.fillStyle = footer.color;
                    tempCtx.globalAlpha = footer.opacity || 1;
                    tempCtx.fillRect(
                        0, 
                        visibleCanvasHeight - footer.height, 
                        visibleCanvasWidth, 
                        footer.height
                    );
                    tempCtx.globalAlpha = 1;
                }

                // Draw texts if they exist
                texts.forEach((text) => {
                    tempCtx.font = `${text.fontSize}px ${text.fontFamily || 'Arial'}`;
                    tempCtx.fillStyle = text.color;
                    tempCtx.textAlign = text.align || 'center';
                    tempCtx.fillText(text.content, text.x, text.y);
                });

                // Handle logo if it exists
                const handleLogo = () => {
                    if (logo.path) {
                        const logoImg = new Image();
                        logoImg.src = logo.path.currentSrc;
                        
                        logoImg.onload = () => {
                            tempCtx.save();
                            tempCtx.translate(logo.x, logo.y);
                            tempCtx.scale(logo.scale, logo.scale);
                            tempCtx.drawImage(logoImg, 0, 0);
                            tempCtx.restore();
                            finalizeCanvas(index);
                        };
                        
                        logoImg.onerror = () => {
                            console.error('Logo failed to load');
                            finalizeCanvas(index);
                        };
                    } else {
                        finalizeCanvas(index);
                    }
                };

                // Finalize the canvas and add to zip
                const finalizeCanvas = (idx) => {
                    const imageData = tempCanvas.toDataURL('image/png', 1.0);
                    const imageName = `canvas-image-${idx + 1}.png`;
                    zip.file(imageName, imageData.split('base64,')[1], { base64: true });
                    
                    completedCanvases++;
                    if (completedCanvases === canvases.length) {
                        generateZip();
                    }
                };

                handleLogo();
            };

            img.onerror = () => {
                console.error('Main image failed to load');
                completedCanvases++;
                if (completedCanvases === canvases.length) {
                    generateZip();
                }
            };
        };

        background.onerror = () => {
            console.error('Background failed to load');
            completedCanvases++;
            if (completedCanvases === canvases.length) {
                generateZip();
            }
        };
    });

    function generateZip() {
        zip.generateAsync({ type: 'blob' }).then(function(content) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `images_${Date.now()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
}

export { download_zip };