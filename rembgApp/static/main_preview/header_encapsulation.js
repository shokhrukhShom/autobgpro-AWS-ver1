// header_encapsulation.js

// Default values (fallback if no metadata is found)
let headerBarColor = 'rgba(0, 0, 0, 0.5)';
let headerBarHeight = 0;
let headerOpacity = 1;

// Fetch header metadata from SQLite database
async function fetchHeaderMetadata(project_id) {
    try {
        const response = await fetch(`/get_metadata/${project_id}/`);
        console.log("response: fetchHeaderMetadata");
        if (!response.ok) {
            console.warn("No header metadata found, using defaults.");
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
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                let fileName;
                

                // OPTIONAL: check if mouse is inside image bounds, assuming full canvas
                if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
                    //console.log("Hovering over image path:", dataPath);
                    fileName = dataPath.split('/').pop();
                    
                    // Start logging every 0.5 second
                    if (!intervalId) {
                        intervalId = setInterval(() => {
                            console.log("Hovering on:", fileName);
                            // ------assign metadata here-------------------
                            let hoveredMetadata = metadataList.find(obj => obj.image_path.endsWith(fileName));
                            console.log("Hovered metadata: ", hoveredMetadata);
                            
                            //Assigning metadata 
                            headerBarColor = hoveredMetadata.header_color;
                            headerBarHeight = hoveredMetadata.header_height;


                        }, 250); // 1 second
                    }
                }
                
            });

            canvas.addEventListener('mouseleave', () => {
                // Stop the interval when mouse leaves
                clearInterval(intervalId);
                intervalId = null;
            });

            // when clicked console log filename but I don't think i will need 
            // since there is hover
            // canvas.addEventListener('click', (e) => {
            //     const rect = canvas.getBoundingClientRect();
            //     const x = e.clientX - rect.left;
            //     const y = e.clientY - rect.top;

            //     // OPTIONAL: same condition for click
            //     if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
            //         //console.log("Clicked image path:", dataPath);
            //         const fileName = fullPath.split('/').pop();
            //         console.log(fileName)

            //     }
            // });
        });
        // -------Getting png from mouse hover and click END -----------------


        

            //return metadataList; // Return all metadata related to the project
            
        // Update header values from metadata
        // headerBarColor = metadata.header_color || headerBarColor;
        // headerBarHeight = metadata.header_height || headerBarHeight;
        // headerOpacity = metadata.header_opacity || headerOpacity;

    } catch (error) {
        console.error("Error fetching header metadata:", error);
    }

}

// Set header values (for manual updates)
function setHeaderValues(height, color, opacity) {
    headerBarHeight = height;
    headerBarColor = color;
    headerOpacity = opacity;
}

// Get current header values
function getHeaderValues() {
    return {
        headerBarColor,
        headerBarHeight,
        headerOpacity,
    };
}

export { fetchHeaderMetadata, setHeaderValues, getHeaderValues, headerBarColor, headerBarHeight };