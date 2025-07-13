//import { drawCanvas } from "./canvas_mouse.js";
import { getCanvasStateDesign, updateCanvasStateDesign,  } from './metadata_fetch.js'; //headerBarColor



//Add event listeners to adjust the height and color of the transparent bar.
let headerOpacityInput = document.getElementById('header-opacity');
let headerOpacityValue = document.getElementById('header-opacity-value');
let headerHeightInput = document.getElementById('header-height');
let headerHeightValue = document.getElementById('header-height-value');
let headerColorInput = document.getElementById('header-color');


// End New Code ---------------------
// Update the header opacity
headerOpacityInput.addEventListener('input', (e) => {
    // New code for header opacity
    const opacity = parseFloat(e.target.value);
    const state = getCanvasStateDesign();
    updateCanvasStateDesign({
        header: {
            ...state.header,
            opacity
        }
    });
    // Update the header opacity value display
    headerOpacityValue.textContent = opacity;
    // End new code for header opacity

    triggerCanvasRedraw(); // Trigger a redraw of the canvas
});



// Adjust the bar height
headerHeightInput.addEventListener('input', (e) => {
    const height = parseInt(e.target.value, 10);
    const state = getCanvasStateDesign();

    updateCanvasStateDesign({
        header: {
            ...state.header,
            height
        }
    });
    // Update the header height value display
    headerHeightValue.textContent = height;
    //end new code for header height

    triggerCanvasRedraw(); // Trigger a redraw of the canvas
});

// Update the header bar color dynamically
headerColorInput.addEventListener('input', () => {
    const color = headerColorInput.value; // hex color input value
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    // headerBarColor = `rgba(${r}, ${g}, ${b}, ${headerOpacity})`;
    
    // NEW CODE ------------------------
    // Update the canvas state with the new header bar colorconst state = getCanvasStateDesign();
    const state = getCanvasStateDesign();
    const newColor = `rgba(${r}, ${g}, ${b}, ${state.header.opacity})`;
    updateCanvasStateDesign({
        header: {
            ...state.header,
            color: newColor
        }
    });
    headerColorInput.value = color; // Update the input value to reflect the new color
    // END NEW CODE ------------------------
    triggerCanvasRedraw(); // Trigger a redraw of the canvas
});



headerOpacityInput.addEventListener('input', (e) => {
    const opacity = parseFloat(e.target.value);
    const state = getCanvasStateDesign();

    // Extract RGB values from existing rgba color string
    const rgbaMatch = state.header.color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const [r, g, b] = rgbaMatch ? rgbaMatch.slice(1, 4) : [0, 0, 0]; // fallback to black

    const updatedColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;

    // Update state with both new opacity and updated color
    updateCanvasStateDesign({
        header: {
            ...state.header,
            opacity,
            color: updatedColor
        }
    });

    headerOpacityValue.textContent = opacity;
    triggerCanvasRedraw();
});



// Function to trigger a canvas redraw
function triggerCanvasRedraw() {

    const state = getCanvasStateDesign(); // Get the current canvas state : new code

    // Dispatch a custom event to notify canvas_mouse.js to redraw the canvas
    const event = new CustomEvent('canvasRedraw', {
        detail: {
            headerBarColor: state.header.color, // Use the updated header bar color from the state
            headerBarHeight: state.header.height // Use the updated header bar height from the state
            // headerBarColor,
            // headerBarHeight
        }
    });
    document.dispatchEvent(event);
}