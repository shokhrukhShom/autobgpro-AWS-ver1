

// new code for logo-------------------
// import {getLogo, setLogo} from './logo_properties.js';
import {canvasDrawLogo} from './logo_properties.js';
import {drawCanvas} from './canvas_mouse.js';
// end new code for logo-------------------


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
                console.log("metadata list: ", metadataList);
            }

            // New Code Starts -----------------------------------------
            // No need to sort - your data already comes in correct order (0.png to 5.png)
            metadataList.forEach((metadata, index) => {});
            // New Code Ends -----------------------------------------



            // const canvases = document.querySelectorAll('.rembg-canvas');
            // const pngImgs = document.querySelectorAll('.png-img');

            // canvases.forEach((canvas, index) => {
            //     const dataPath = pngImgs[index].dataset.path;
  
            // });
            
        } catch (error) {
            console.error("Error fetching header metadata:", error);
        }
    }

}


export { 
    fetchMetadataAPI
    };