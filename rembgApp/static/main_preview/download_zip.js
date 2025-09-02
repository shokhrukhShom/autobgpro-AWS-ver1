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
                    showError('Failed to fetch metadata - proceeding without metadata', 'red');
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
                            showError('No images found for this project', 'red');
                            throw new Error('No images found for this project');
                        }
                        // New
                        // Sort images by their numerical filename (0.png, 1.png, etc.)
                        const sortedImagePaths = imagePaths.sort((a, b) => {
                            const getNumber = (path) => {
                                const match = path.match(/(\d+)\.png$/);
                                return match ? parseInt(match[1]) : Infinity;
                            };
                            return getNumber(a) - getNumber(b);
                        });


                        let processedImages = 0;
                        const totalImages = sortedImagePaths.length; //imagePaths.length;

                        sortedImagePaths.forEach((imagePath, index) => {
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
                                        generateZipFile(zip, `AutoBGPRO-${timestamp}.zip`);

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
        img.src = imagePath + '?v=' + Date.now();
        img.crossOrigin = 'Anonymous';

        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;

            // Load background image
            const bg = new Image();
            bg.crossOrigin = 'Anonymous';
            
            // Add cache busting to prevent CORS caching issues
            const bgSrc = metadata.project?.background_image || metadata.background_path || 'https://autobgpro-bkt.s3.amazonaws.com/media/bg-templates/patform.jpg';
            bg.src = bgSrc + '?v=' + Date.now();

            // Set timeout for background image loading
            const bgLoadTimeout = setTimeout(() => {
                console.warn('Background image load timeout, using fallback');
                drawWithFallbackBackground();
            }, 5000);

            bg.onload = function() {
                clearTimeout(bgLoadTimeout);
                drawWithBackground(bg);
            };

            bg.onerror = function() {
                clearTimeout(bgLoadTimeout);
                console.error('Failed to load background:', bgSrc);
                drawWithFallbackBackground();
            };

            function drawWithBackground(backgroundImage) {
                // Draw background
                ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
                drawRemainingElements();
            }

            function drawWithFallbackBackground() {
                // Use a solid color fallback
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawRemainingElements();
            }

            function drawRemainingElements() {
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
                    // Add cache busting to logo URL too
                    logo.src = metadata.logo_path + '?v=' + Date.now();

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
            }
        };

        img.onerror = function() {
            console.error('Failed to load image:', imagePath);
            // Skip this image in the zip
            processedImages++;
        };
    }

    // function processImageForDownload(imagePath, metadata, callback) {
    //     const img = new Image();
    //     img.src = imagePath;
    //     img.crossOrigin = 'Anonymous';

    //     img.onload = function() {
    //         const canvas = document.createElement('canvas');
    //         const ctx = canvas.getContext('2d');
    //         canvas.width = CANVAS_WIDTH;
    //         canvas.height = CANVAS_HEIGHT;

    //         // Load background image
    //         const bg = new Image();
    //         bg.crossOrigin = 'Anonymous';
    //         bg.src = metadata.project?.background_image || metadata.background_path || 'https://autobgpro-bkt.s3.amazonaws.com/media/bg-templates/patform.jpg';
            

    //         bg.onload = function() {
    //             // Draw background
    //             ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    //             // Draw header if exists
    //             if (metadata.header_height > 0) {
    //                 ctx.fillStyle = metadata.header_color || '#000000';
    //                 ctx.globalAlpha = metadata.header_opacity || 1.0;
    //                 ctx.fillRect(0, 0, canvas.width, metadata.header_height);
    //                 ctx.globalAlpha = 1.0;
    //             }

    //             // Draw footer if exists
    //             if (metadata.footer_height > 0) {
    //                 ctx.fillStyle = metadata.footer_color || '#000000';
    //                 ctx.globalAlpha = metadata.footer_opacity || 1.0;
    //                 ctx.fillRect(0, canvas.height - metadata.footer_height, canvas.width, metadata.footer_height);
    //                 ctx.globalAlpha = 1.0;
    //             }

    //             // Apply shadow if specified
    //             if (metadata.shadow_blur > 0) {
    //                 ctx.shadowColor = metadata.shadow_color || 'rgba(0, 0, 0, 0.7)';
    //                 ctx.shadowBlur = metadata.shadow_blur || 0;
    //                 ctx.shadowOffsetY = metadata.shadow_offset_y || 0;
    //             }

    //             // Calculate image position and scale
    //             const scale = metadata.image_scale || 0.8;
    //             const imgWidth = img.width * scale;
    //             const imgHeight = img.height * scale;
    //             const posX = (metadata.image_x || canvas.width / 2) - (imgWidth / 2);
    //             const posY = (metadata.image_y || canvas.height / 2) - (imgHeight / 2);

    //             // Draw main image
    //             ctx.drawImage(img, posX, posY, imgWidth, imgHeight);

    //             // Reset shadow
    //             ctx.shadowColor = 'transparent';
    //             ctx.shadowBlur = 0;
    //             ctx.shadowOffsetY = 0;

    //             // Draw texts if they exist
    //             if (metadata.texts && metadata.texts.length > 0) {
    //                 metadata.texts.forEach((text) => {
    //                     ctx.font = `${text.fontSize || 20}px ${text.fontFamily || 'Arial'}`;
    //                     ctx.fillStyle = text.color || '#000000';
    //                     ctx.textAlign = text.align || 'center';
    //                     ctx.fillText(text.content, text.x || 0, text.y || 0);
    //                 });
    //             }

    //             // Draw logo if it exists
    //             if (metadata.logo_path) {
    //                 const logo = new Image();
    //                 logo.crossOrigin = 'Anonymous';
    //                 logo.src = metadata.logo_path;

    //                 logo.onload = function() {
    //                     const logoScale = metadata.logo_scale || 1.0;
    //                     const logoWidth = logo.width * logoScale;
    //                     const logoHeight = logo.height * logoScale;
    //                     const logoX = metadata.logo_x || 0;
    //                     const logoY = metadata.logo_y || 0;

    //                     ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
    //                     callback(canvas);
    //                 };

    //                 logo.onerror = function() {
    //                     console.error('Failed to load logo:', metadata.logo_path);
    //                     callback(canvas);
    //                 };
    //             } else {
    //                 callback(canvas);
    //             }
    //         };

    //         bg.onerror = function() {
    //             console.error('Failed to load background:', bg.src);
    //             // Continue with default background color
    //             ctx.fillStyle = '#ffffff';
    //             ctx.fillRect(0, 0, canvas.width, canvas.height);
    //             callback(canvas);
    //         };
    //     };

    //     img.onerror = function() {
    //         console.error('Failed to load image:', imagePath);
    //         // Skip this image in the zip
    //         processedImages++;
    //     };
    // }

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

