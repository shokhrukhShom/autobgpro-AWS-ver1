// function download_zip() {
//     const canvases = document.querySelectorAll(".rembg-canvas");
//     const images = document.querySelectorAll(".png-img");
//     const zip = new JSZip();

//     console.log('download btn clicked - download_zip');

//     // Track completed canvases
//     let completedCanvases = 0;

//     canvases.forEach((canvas, index) => {
//         let finalMetadataArray = Array.from(metadataMap.values());
//         let metadata = finalMetadataArray[index];
//         console.log("Metadata download_zip: ", metadata);

//         if (!metadata) {
//             console.error('No metadata found for canvas', index);
//             return;
//         }

//         // Extract design data with defaults
//         const designData = metadata.design_data || {};
//         const header = designData.header || { height: 0, color: '#000000' };
//         const footer = designData.footer || { height: 0, color: '#000000' };
//         const texts = designData.texts || [];
//         const logo = {
//             path: designData.logo_path,
//             scale: designData.logo_scale || 1,
//             x: designData.logo_x || 0,
//             y: designData.logo_y || 0
//         };

//         const visibleCanvasWidth = canvas.width;
//         const visibleCanvasHeight = canvas.height;

//         // Create temporary canvas
//         const tempCanvas = document.createElement('canvas');
//         const tempCtx = tempCanvas.getContext('2d');
//         tempCanvas.width = visibleCanvasWidth;
//         tempCanvas.height = visibleCanvasHeight;

//         // Load background
//         const background = new Image();
//         background.src = currentBg !== "None" ? currentBg : '/media/bg-templates/patform.jpg';

//         background.onload = () => {
//             // Draw background
//             tempCtx.drawImage(background, 0, 0, visibleCanvasWidth, visibleCanvasHeight);

//             // Draw header if it exists
//             if (header.height > 0) {
//                 tempCtx.fillStyle = header.color;
//                 tempCtx.globalAlpha = header.opacity || 1;
//                 tempCtx.fillRect(0, 0, visibleCanvasWidth, header.height);
//                 tempCtx.globalAlpha = 1;
//             }

//             // Load main image
//             const img = new Image();
//             img.src = images[index].dataset.path;

//             img.onload = () => {
//                 // Calculate scaled dimensions
//                 const imgWidth = img.naturalWidth * metadata.imageScale;
//                 const imgHeight = img.naturalHeight * metadata.imageScale;

//                 // Set shadow properties
//                 tempCtx.shadowOffsetX = 0;
//                 tempCtx.shadowOffsetY = metadata.shadowOffsetY || 0;
//                 tempCtx.shadowBlur = metadata.shadowBlur || 0;
//                 tempCtx.shadowColor = metadata.shadowColor || 'rgba(0, 0, 0, 0.7)';

//                 // Draw main image
//                 tempCtx.drawImage(
//                     img,
//                     metadata.imageX - (imgWidth / 2),
//                     metadata.imageY - (imgHeight / 2),
//                     imgWidth,
//                     imgHeight
//                 );

//                 // Reset shadow
//                 tempCtx.shadowOffsetX = 0;
//                 tempCtx.shadowOffsetY = 0;
//                 tempCtx.shadowBlur = 0;
//                 tempCtx.shadowColor = 'transparent';

//                 // Draw footer if it exists
//                 if (footer.height > 0) {
//                     tempCtx.fillStyle = footer.color;
//                     tempCtx.globalAlpha = footer.opacity || 1;
//                     tempCtx.fillRect(
//                         0, 
//                         visibleCanvasHeight - footer.height, 
//                         visibleCanvasWidth, 
//                         footer.height
//                     );
//                     tempCtx.globalAlpha = 1;
//                 }

//                 // Draw texts if they exist
//                 texts.forEach((text) => {
//                     tempCtx.font = `${text.fontSize}px ${text.fontFamily || 'Arial'}`;
//                     tempCtx.fillStyle = text.color;
//                     tempCtx.textAlign = text.align || 'center';
//                     tempCtx.fillText(text.content, text.x, text.y);
//                 });

//                 // Handle logo if it exists
//                 const handleLogo = () => {
//                     if (logo.path) {
//                         const logoImg = new Image();
//                         logoImg.src = logo.path.currentSrc;
                        
//                         logoImg.onload = () => {
//                             tempCtx.save();
//                             tempCtx.translate(logo.x, logo.y);
//                             tempCtx.scale(logo.scale, logo.scale);
//                             tempCtx.drawImage(logoImg, 0, 0);
//                             tempCtx.restore();
//                             finalizeCanvas(index);
//                         };
                        
//                         logoImg.onerror = () => {
//                             console.error('Logo failed to load');
//                             finalizeCanvas(index);
//                         };
//                     } else {
//                         finalizeCanvas(index);
//                     }
//                 };

//                 // Finalize the canvas and add to zip
//                 const finalizeCanvas = (idx) => {
//                     const imageData = tempCanvas.toDataURL('image/png', 1.0);
//                     const imageName = `image-${idx + 1}.png`;
//                     zip.file(imageName, imageData.split('base64,')[1], { base64: true });
                    
//                     completedCanvases++;
//                     if (completedCanvases === canvases.length) {
//                         generateZip();
//                     }
//                 };

//                 handleLogo();
//             };

//             img.onerror = () => {
//                 console.error('Main image failed to load');
//                 completedCanvases++;
//                 if (completedCanvases === canvases.length) {
//                     generateZip();
//                 }
//             };
//         };

//         background.onerror = () => {
//             console.error('Background failed to load');
//             completedCanvases++;
//             if (completedCanvases === canvases.length) {
//                 generateZip();
//             }
//         };
//     });

//     function generateZip() {
//         zip.generateAsync({ type: 'blob' }).then(function(content) {
//             const link = document.createElement('a');
//             link.href = URL.createObjectURL(content);
//             link.download = `images_${Date.now()}.zip`;
//             document.body.appendChild(link);
//             link.click();
//             document.body.removeChild(link);
//         });
//     }
// }

// export { download_zip };



function download_zip(projectId) {
    const zip = new JSZip();
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const CANVAS_WIDTH = 1200;
    const CANVAS_HEIGHT = 800;

    // Show loading state
    showError('Preparing your download...', '#1b5e95');

    return new Promise((resolve, reject) => {
        // First fetch the metadata
        fetch(`/get_metadata/${projectId}/`)
            .then(response => {
                if (!response.ok) {
                    console.warn('Failed to fetch metadata - proceeding without metadata');
                    return null;
                }
                return response.json();
            })
            .then(metadataList => {
                // Then fetch the project images
                fetch(`/get_project_images/${projectId}/`)
                    .then(response => {
                        if (!response.ok) throw new Error('Failed to fetch images');
                        return response.json();
                    })
                    .then(data => {
                        const imagePaths = data.images || [];
                        if (imagePaths.length === 0) {
                            throw new Error('No images found for this project');
                        }

                        let processedImages = 0;
                        const totalImages = imagePaths.length;

                        imagePaths.forEach((imagePath, index) => {
                            // Use metadata if available, otherwise use empty object
                            const metadata = (metadataList && metadataList.length > 0) ? 
                                (metadataList.find(m => 
                                    m.image_path && m.image_path.includes(imagePath.split('/').pop())
                                ) || metadataList[0] ) 
                                : {};

                            processImageForDownload(imagePath, metadata, (canvas) => {
                                // Convert canvas to image and add to zip
                                canvas.toBlob((blob) => {
                                    const imageName = `image_${index + 1}.png`;
                                    zip.file(imageName, blob);
                                    
                                    processedImages++;
                                    if (processedImages === totalImages) {
                                        generateZipFile(zip, `project-images-${timestamp}.zip`);

                                        showError('Download completed successfully!', '#4CAF50');

                                        resolve();
                                    }
                                }, 'image/png', 1.0);
                            });
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching project images:', error);
                        showError('Error fetching project images: ' + error, 'red')
                        reject(error);
                    });
            })
            .catch(error => {
                console.error('Error in metadata processing:', error);
                showError('Error in metadata processing: ' + error, 'red')
                reject(error);
            });
    });

    function processImageForDownload(imagePath, metadata, callback) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imagePath;

        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;

            // Load background image
            const bg = new Image();
            bg.crossOrigin = 'Anonymous';
            bg.src = metadata.project?.background_image || metadata.background_path || '/media/bg-templates/patform.jpg';

            bg.onload = function() {
                // Draw background
                ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

                // Draw header if exists
                if (metadata.header_height > 0) {
                    ctx.fillStyle = metadata.header_color || '#000000';
                    ctx.globalAlpha = metadata.header_opacity || 1.0;
                    ctx.fillRect(0, 0, canvas.width, metadata.header_height);
                    ctx.globalAlpha = 1.0;
                }

                // Draw footer if exists
                if (metadata.footer_height > 0) {
                    ctx.fillStyle = metadata.footer_color || '#000000';
                    ctx.globalAlpha = metadata.footer_opacity || 1.0;
                    ctx.fillRect(0, canvas.height - metadata.footer_height, canvas.width, metadata.footer_height);
                    ctx.globalAlpha = 1.0;
                }

                // Apply shadow if specified
                if (metadata.shadow_blur > 0) {
                    ctx.shadowColor = metadata.shadow_color || 'rgba(0, 0, 0, 0.7)';
                    ctx.shadowBlur = metadata.shadow_blur || 0;
                    ctx.shadowOffsetY = metadata.shadow_offset_y || 0;
                }

                // Calculate image position and scale
                const scale = metadata.image_scale || 0.8;
                const imgWidth = img.width * scale;
                const imgHeight = img.height * scale;
                const posX = (metadata.image_x || canvas.width / 2) - (imgWidth / 2);
                const posY = (metadata.image_y || canvas.height / 2) - (imgHeight / 2);

                // Draw main image
                ctx.drawImage(img, posX, posY, imgWidth, imgHeight);

                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;

                // Draw texts if they exist
                if (metadata.texts && metadata.texts.length > 0) {
                    metadata.texts.forEach((text) => {
                        ctx.font = `${text.fontSize || 20}px ${text.fontFamily || 'Arial'}`;
                        ctx.fillStyle = text.color || '#000000';
                        ctx.textAlign = text.align || 'center';
                        ctx.fillText(text.content, text.x || 0, text.y || 0);
                    });
                }

                // Draw logo if it exists
                if (metadata.logo_path) {
                    const logo = new Image();
                    logo.crossOrigin = 'Anonymous';
                    logo.src = metadata.logo_path;

                    logo.onload = function() {
                        const logoScale = metadata.logo_scale || 1.0;
                        const logoWidth = logo.width * logoScale;
                        const logoHeight = logo.height * logoScale;
                        const logoX = metadata.logo_x || 0;
                        const logoY = metadata.logo_y || 0;

                        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
                        callback(canvas);
                    };

                    logo.onerror = function() {
                        console.error('Failed to load logo:', metadata.logo_path);
                        callback(canvas);
                    };
                } else {
                    callback(canvas);
                }
            };

            bg.onerror = function() {
                console.error('Failed to load background:', bg.src);
                // Continue with default background color
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                callback(canvas);
            };
        };

        img.onerror = function() {
            console.error('Failed to load image:', imagePath);
            // Skip this image in the zip
            processedImages++;
        };
    }

    function generateZipFile(zip, filename) {
        zip.generateAsync({ type: 'blob' }).then(function(content) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
}

export { download_zip };


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