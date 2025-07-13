

// new code for logo-------------------
// import {getLogo, setLogo} from './logo_properties.js';
import {canvasDrawLogo} from './logo_properties.js';
import {drawCanvas} from './canvas_mouse.js';
// end new code for logo-------------------

// New Code for design  ------------------------------------------------
// State object to hold canvas design metadata
// let canvasStateDesign = {
//     header: {
//         height: 0,
//         color: 'rgba(0, 0, 0, 0.5)',
//         opacity: 1
//     },
//     footer: {
//         height: 0,
//         color: 'rgba(0, 0, 0, 0.5)',
//         opacity: 1,
//         texts: []
//     },
//     logo: {
//         image: null,
//         x: 100,
//         y: 100,
//         scale: 0.1
//     }
// };

// // Function to get the current canvas state
// export function getCanvasStateDesign() {
//     return canvasStateDesign;
// }
// // Function to update the canvas state
// export function updateCanvasStateDesign(newState) {
//     canvasStateDesign = {...canvasStateDesign, ...newState};
// }
// New Code End-----------------------------------------------------------


// New Code for design  ------------------------------------------------
// State object to hold canvas design metadata
let canvasStateDesign = {
    header: {
        height: 0,
        color: 'rgba(0, 0, 0, 0.5)',
        opacity: 1
    },
    footer: {
        height: 0,
        color: 'rgba(0, 0, 0, 0.5)',
        opacity: 1,
        texts: []
    },
    logo: {
        image: null,
        x: 100,
        y: 100,
        scale: 0.1
    }
};

// Function to get the current canvas state
export function getCanvasStateDesign() {
    return canvasStateDesign;
}
// Function to update the canvas state
export function updateCanvasStateDesign(newState) {
    canvasStateDesign = {...canvasStateDesign, ...newState};
}
// New Code End-----------------------------------------------------------




// State object to hold canvas metadata
let canvasStates = new Map(); // Changed to a Map to store state per canvas

// Function to get the current canvas state for a specific canvas
export function getCanvasState(canvasId) {
    if (!canvasStates.has(canvasId)) {

        // Default state if not found
        canvasStates.set(canvasId, {
            header: {
                height: 0,
                color: 'rgba(0, 0, 0, 0.5)',
                opacity: 1
            },
            footer: {
                height: 0,
                color: 'rgba(0, 0, 0, 0.5)',
                opacity: 1,
                texts: []
            },
            logo: {
                image: null,
                x: 100,
                y: 100,
                scale: 0.1
            }
        });
    }
    return canvasStates.get(canvasId);
}

// Function to update the canvas state for a specific canvas
export function updateCanvasState(canvasId, newState) {
    //const currentState = getCanvasState(canvasId);
    canvasStates.set(canvasId, {...getCanvasState(canvasId), ...newState});
}




window.disableFetchMetadata = false; // Flag to disable metadata fetching
// Fetch header metadata from SQLite database
async function fetchMetadataAPI(project_id) { // export new added
    
    console.log("disableFetchMetadata:", window.disableFetchMetadata);
    if (window.disableFetchMetadata) {
        console.log("Metadata fetching is disabled.");
        return; // Exit if fetching is disabled
    }
   

    try {
        const response = await fetch(`/get_metadata/${project_id}/`);
        console.log("response: fetchMetadata");
        if (!response.ok) {
            console.warn("No metadata found, using defaults.");
            return;
        }

        const metadataList = await response.json();

        if (!metadataList.length) return null; // If no metadata, do nothing
        
        // apply metadata to canvas(es) TODO
        if (metadataList){
            
            // For some reason png images is not sorted. following code ensurs sorting by 0.png 1.png 2.png... etc. 
            //Sort metadataList by PNG Name
            if(metadataList){
                metadataList.sort((a, b) => {
                    const nameA = parseInt(a.image_path.match(/(\d+)\.png$/)[1], 10);
                    const nameB = parseInt(b.image_path.match(/(\d+)\.png$/)[1], 10);
                    return nameA - nameB;
                });
            }
            console.log("metadata list: ", metadataList);
        }

        // new code
        // Create a map of canvasId to metadata
        const canvases = document.querySelectorAll('.rembg-canvas');
        canvases.forEach((canvas, index) => {
            const canvasId = canvas.id || `canvas-${index}`;
            const metadata = metadataList[index];
            
            if (metadata) {
                
                const newState = {};

                // Process header
                if (metadata.header_height || metadata.header_color) {
                    let headerColor = metadata.header_color;
                    // Fix color format if needed
                    if (headerColor && headerColor.includes('NaN')) {
                        headerColor = 'rgba(0, 0, 0, 0.5)';
                    }
                    
                    newState.header = {
                        height: metadata.header_height || 0,
                        color: headerColor || 'rgba(0, 0, 0, 0.5)',
                        opacity: metadata.header_opacity || 0.7
                    };
                }
                
                // Process footer
                if (metadata.footer_height || metadata.footer_color) {
                    let footerColor = metadata.footer_color;
                    // Fix color format if needed
                    if (footerColor && footerColor.includes('NaN')) {
                        footerColor = 'rgba(0, 0, 0, 0.5)';
                    }
                    
                    newState.footer = {
                        height: metadata.footer_height || 0,
                        color: footerColor || 'rgba(0, 0, 0, 0.5)',
                        opacity: metadata.footer_opacity || 0.5,
                        texts: metadata.texts || []
                    };
                }
                
                // Process logo
                if (metadata.logo_path) {
                    const logoImg = new Image();
                    logoImg.crossOrigin = 'Anonymous';
                    logoImg.src = metadata.logo_path;
                    logoImg.onload = () => {
                        newState.logo = {
                            image: logoImg,
                            x: metadata.logo_x || 100,
                            y: metadata.logo_y || 100,
                            scale: metadata.logo_scale || 0.1
                        };
                        updateCanvasState(canvasId, newState);
                        // Trigger redraw for this canvas
                        const event = new CustomEvent('canvasRedraw', { detail: { canvasId } });
                        document.dispatchEvent(event);
                    };
                    logoImg.onerror = () => {
                        console.error('Failed to load logo:', metadata.logo_path);
                        updateCanvasState(canvasId, newState);
                    };
                } else {
                    updateCanvasState(canvasId, newState);
                }
            }
        });
        // end new code
        
    } catch (error) {
        console.error("Error fetching header metadata:", error);
    }
    

}


export { 
    fetchMetadataAPI
    };