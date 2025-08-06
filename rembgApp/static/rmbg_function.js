import { getCanvasStateDesign, updateCanvasStateDesign } from './main_preview/metadata_fetch.js';

// Global helper function
function getCSRFToken() {
    const cookieValue = document.cookie.match(/csrftoken=([^ ;]+)/);
    return cookieValue ? cookieValue[1] : null;
}


function saveChanges(){

    //console.log("save btn pressed");
    const finalMetadataArray = Array.from(metadataMap.values()); // metadataMap 
    console.log(finalMetadataArray);
    
    // Fetch POST to save sqlite database

    fetch('save_metadata', {  // Adjust URL based on your Django URL structure
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken() // Include CSRF token
        },
        body: JSON.stringify({ metadata:finalMetadataArray }) 
    })
    .then(response => response.json())
    .then(data => {
        console.log("Response from server:", data);
        showError("Saved", "green")
     
    })
    .catch(error => {
        console.error("Error saving metadata:", error);
        showError("Error saving metadata: " + error, "red");
    });
}



export function saveTextComponents() {
    try {
        const visibleCanvases = Array.from(document.querySelectorAll('.rembg-canvas'))
            .filter(canvas => canvas.offsetParent !== null);

        if (visibleCanvases.length === 0) {
            showError("No visible canvases found", "red");
            return;
        }

        const project_id = "{{ latest_upload_id|escapejs }}";
        const state = getCanvasStateDesign();

        const elements = visibleCanvases.map(canvas => {
            const meta = window.metadataMap.get(canvas);
            
            if (!meta) {
                throw new Error("Metadata not found for canvas");
            }

            // Get relative image path
            let imagePath = meta.imagePath;
            if (imagePath.includes(window.location.origin)) {
                imagePath = imagePath.replace(window.location.origin, '');
            }
            imagePath = imagePath.split('?')[0];

            // Get logo path if exists
            let logoPath = '';
            if (state.logo?.image?.src) {
                logoPath = new URL(state.logo.image.src).pathname;
            }

            return {
                image_path: imagePath,
                design_data: {
                    header: state.header || {
                        height: 0,
                        color: '#000000',
                        opacity: 1
                    },
                    footer: state.footer || {
                        height: 0,
                        color: '#000000',
                        opacity: 1
                    },
                    texts: state.footer?.texts || [],
                    logo_path: logoPath,
                    logo_x: state.logo?.x || 100,
                    logo_y: state.logo?.y || 100,
                    logo_scale: state.logo?.scale || 0.1
                }
            };
        });

        const data = {
            project_id: window.project_id,
            elements: elements
        };

        console.log("Saving design data:", JSON.stringify(data, null, 2));

        return fetch('save_metadata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                // Try to get detailed error from server
                return response.text().then(text => {
                    let errorMsg = 'Failed to save design';
                    try {
                        const jsonError = JSON.parse(text);
                        errorMsg = jsonError.error || jsonError.message || text;
                    } catch {
                        errorMsg = text || 'Unknown server error';
                    }
                    throw new Error(errorMsg);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log("Design saved:", data);
            showError("Design saved successfully!", "green");
            return data;
        })
        .catch(error => {
            console.error("Full error details:", error);
            showError(`Save failed: ${error.message}`, "red");
            throw error; // Re-throw for further handling
        });

    } catch (error) {
        console.error("Error in saveTextComponents:", error);
        showError(`Error saving design: ${error.message}`, "red");
        throw error;
    }
}

// Initialize in rmbg.html
document.getElementById('saveTextBtn')?.addEventListener('click', saveTextComponents);

