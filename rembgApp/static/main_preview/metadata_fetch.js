

// new code for logo-------------------
// import {getLogo, setLogo} from './logo_properties.js';
import {canvasDrawLogo} from './logo_properties.js';
import {drawCanvas} from './canvas_mouse.js';
// end new code for logo-------------------



// // Default values (fallback if no metadata is found)
// let headerBarColor = 'rgba(0, 0, 0, 0.5)';
// let headerBarHeight = 0;
// let headerOpacity = 1;

// let footerHeight = 1;
// let footerColor = 'rgba(0, 0, 0, 0.5)';
// let footerTexts = [];

// let logoImage = ''; // New code for logo-------------------
// let logoX = 100;
// let logoY = 100;
// let logoScale = 0.1;
// // end new code for logo-------------------

// State object to hold canvas metadata
let canvasState = {
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
export function getCanvasState() {
    return canvasState;
}
// Function to update the canvas state
export function updateCanvasState(newState) {
    canvasState = {...canvasState, ...newState};
}




window.disableFetchMetadata = false; // Flag to disable metadata fetching
// Fetch header metadata from SQLite database
async function fetchMetadataAPI(project_id) { // export new added
    
    console.log("disableFetchMetadata:", window.disableFetchMetadata);
    if (window.disableFetchMetadata) {
        console.log("Metadata fetching is disabled.");
        return; // Exit if fetching is disabled
    }
    else {

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
                console.log(metadataList);
            }

            // Getting png from mouse hover and click
            const canvases = document.querySelectorAll('.rembg-canvas');
            const pngImgs = document.querySelectorAll('.png-img');

            canvases.forEach((canvas, index) => {
                const dataPath = pngImgs[index].dataset.path;

                let intervalId = null;

                // Use bounding box of entire canvas since image is drawn to fill it
                canvas.addEventListener('mousemove', (e) => {
                    // Check if metadata fetching is disabled
                    if (window.disableFetchMetadata) {
                        console.log("Metadata fetching is disabled, skipping mousemove logic.");
                        return; // Prevent the rest of the mousemove logic
                    }

                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    let fileName;
                    

                    // OPTIONAL: check if mouse is inside image bounds, assuming full canvas
                    if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
                        //console.log("Hovering over image path:", dataPath);
                        fileName = dataPath.split('/').pop();
                        
                        // Start updating every 0.25 second
                        if (!intervalId) {
                            if (disableFetchMetadata) {
                                console.log("Metadata fetching is disabled, skipping intervalId logic.");
                                return; // Prevent the rest of the mousemove logic
                            }

                            intervalId = setInterval(() => {
                                //console.log("Hovering on:", fileName);
                                // ------assign metadata here-------------------
                                let hoveredMetadata = metadataList.find(obj => obj.image_path.endsWith(fileName));
                                //console.log("Hovered metadata: ", hoveredMetadata);
                                
                                
                                //Assigning metadata 
                                // headerBarColor = hoveredMetadata.header_color;
                                // headerBarHeight = hoveredMetadata.header_height;

                                // footerHeight = hoveredMetadata.footer_height;
                                // footerColor = hoveredMetadata.footer_color;
                                // footerTexts = hoveredMetadata.texts;
                                
                                console.log("disableFetchMetadata interval:", window.disableFetchMetadata);


                                // New code for logo update -------------------------
                                // if (hoveredMetadata.logo_path) {
                                //     const logoImg = new Image();
                                //     logoImg.src = hoveredMetadata.logo_path;
                                //     setLogo(
                                //         logoImg,
                                //         hoveredMetadata.logo_x || 100,
                                //         hoveredMetadata.logo_y || 100,
                                //         hoveredMetadata.logo_scale || 0.1
                                //     );
                                    
                                //     logoImg.onload = function() {
                                //         const logo = getLogo();
                                //         // Trigger canvas redraw with updated logo
                                //         const event = new CustomEvent('canvasDrawLogo', {
                                //             detail: {
                                //                 // headerBarColor,
                                //                 // headerBarHeight,
                                //                 // footerColor,
                                //                 // footerHeight,
                                //                 // footerTexts,
                                //                 logoImage: logo.image,
                                //                 logoX: logo.x,
                                //                 logoY: logo.y,
                                //                 logoScale: logo.scale
                                //             }
                                //         });
                                //         document.dispatchEvent(event);
                                //     };
                                // }
                                // End new code for logo -------------------------
                                
                            }, 100); // 0.2 second
                        }
                    }
                    
                });

                canvas.addEventListener('mouseleave', () => {
                    // Stop the interval when mouse leaves
                    clearInterval(intervalId);
                    intervalId = null;
                });

                
            });
            
        } catch (error) {
            console.error("Error fetching header metadata:", error);
        }
    }

}



// Set header values (for manual updates)
function setMetaValues(
    header_height, 
    header_color, 
    header_opacity, 
    footer_color, 
    footer_height, 
    texts,
    // logo_path = '',
    // logo_x = 100,
    // logo_y = 100,
    // logo_scale = 0.1

    ) {
        
        headerBarHeight = header_height;
        headerBarColor = header_color;
        headerOpacity = header_opacity;
        footerColor = footer_color;
        footerHeight = footer_height;
        footerTexts = texts;

        // new code for logo-------------------
        // logoImage = logo_path;
        // logoX = logo_x;
        // logoY = logo_y;
        // logoScale = logo_scale;

        // end new code for logo-------------------
    }

// Get current header values
function getMetaValues() {
    return {
        headerBarHeight,
        headerBarColor,
        headerOpacity,
        footerColor,
        footerHeight,
        footerTexts,
        // Logo
        // logoImage,
        // logoX,
        // logoY,
        // logoScale,
    };
}

export { 
    fetchMetadataAPI, 
    setMetaValues, 
    getMetaValues, 
    // headerBarColor, 
    // headerBarHeight, 
    // footerColor, 
    // footerHeight, 
    // footerTexts,

    // Logo
    // logoImage,
    // logoX,
    // logoY,
    // logoScale,
    };