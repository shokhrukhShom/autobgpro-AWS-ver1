// static/js/recentProjects.js

// function downloadRecentProject(projectId) {
//     return new Promise((resolve, reject) => {
//         // Get the current project's metadata from the server
//         fetch(`/get_metadata/${projectId}/`)
//             .then(response => {
//                 if (!response.ok) throw new Error('Failed to fetch metadata');
//                 return response.json();
//             })
//             .then(metadataList => {
//                 if (!metadataList || metadataList.length === 0) {
//                     throw new Error('No metadata found for this project');
//                 }

//                 // Get the project's image paths
//                 fetch(`/get_project_images/${projectId}/`)
//                     .then(response => {
//                         if (!response.ok) throw new Error('Failed to fetch images');
//                         return response.json();
//                     })
//                     .then(data => {
//                         const imagePaths = data.images || [];
//                         if (imagePaths.length === 0) {
//                             throw new Error('No images found for this project');
//                         }

//                         const zip = new JSZip();
//                         let processedImages = 0;
//                         const totalImages = imagePaths.length;

//                         imagePaths.forEach((imagePath, index) => {
//                             // Find metadata for this specific image
//                             const metadata = metadataList.find(m => 
//                                 m.image_path && m.image_path.includes(imagePath.split('/').pop())
//                             )|| metadataList[0];

//                             processImageForDownload(imagePath, metadata, (canvas) => {
//                                 // Convert canvas to image and add to zip
//                                 canvas.toBlob((blob) => {
//                                     const imageName = `image_${index + 1}.png`;
//                                     zip.file(imageName, blob);
                                    
//                                     processedImages++;
//                                     if (processedImages === totalImages) {
//                                         generateZipFile(zip, "recent-project-images.zip");
//                                         resolve();
//                                     }
//                                 }, 'image/png', 1.0);
//                             });
//                         });
//                     })
//                     .catch(error => {
//                         console.error('Error fetching project images:', error);
//                         reject(error);
//                     });
//             })
//             .catch(error => {
//                 console.error('Error fetching metadata:', error);
//                 reject(error);
//             });
//     });
// }

function downloadRecentProject(projectId) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-'); // Replaces colons and dots to make it filename-safe

    return new Promise((resolve, reject) => {
        // Get the current project's metadata from the server
        fetch(`/get_metadata/${projectId}/`)
            .then(response => {
                if (!response.ok) {
                    console.warn('Failed to fetch metadata - proceeding without metadata');
                    return null; // Return null to indicate no metadata
                }
                return response.json();
            })
            .then(metadataList => {
                // Get the project's image paths
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

                        const zip = new JSZip();
                        let processedImages = 0;
                        const totalImages = imagePaths.length;

                        imagePaths.forEach((imagePath, index) => {
                            // Use metadata if available, otherwise use empty object
                            const metadata = (metadataList && metadataList.length > 0) ? 
                                (metadataList.find(m => 
                                    m.image_path && m.image_path.includes(imagePath.split('/').pop())
                                ) || metadataList[0]) : 
                                {};

                            processImageForDownload(imagePath, metadata, (canvas) => {
                                // Convert canvas to image and add to zip
                                canvas.toBlob((blob) => {
                                    const imageName = `image_${index + 1}.png`;
                                    zip.file(imageName, blob);
                                    
                                    processedImages++;
                                    if (processedImages === totalImages) {
                                        generateZipFile(zip, `recent-project-images ${timestamp}.zip`);
                                        resolve();
                                    }
                                }, 'image/png', 1.0);
                            });
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching project images:', error);
                        reject(error);
                    });
            })
            .catch(error => {
                console.error('Error in metadata processing:', error);
                // Even if metadata fails, try to proceed with image download
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

                        const zip = new JSZip();
                        let processedImages = 0;
                        const totalImages = imagePaths.length;

                        imagePaths.forEach((imagePath, index) => {
                            // Process with empty metadata
                            processImageForDownload(imagePath, {}, (canvas) => {
                                canvas.toBlob((blob) => {
                                    const imageName = `image_${index + 1}.png`;
                                    zip.file(imageName, blob);
                                    
                                    processedImages++;
                                    if (processedImages === totalImages) {
                                        generateZipFile(zip, "recent-project-images.zip");
                                        resolve();
                                    }
                                }, 'image/png', 1.0);
                            });
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching project images:', error);
                        reject(error);
                    });
            });
    });
}

function processImageForDownload(imagePath, metadata, callback) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imagePath;

    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions (same as in editor)
        canvas.width = 1200;
        canvas.height = 800;

        // Load background image
        const bg = new Image();
        bg.crossOrigin = 'Anonymous';
        bg.src =  metadata.project?.background_image || metadata.background_path || '/media/bg-templates/patform.jpg';

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

export { downloadRecentProject };