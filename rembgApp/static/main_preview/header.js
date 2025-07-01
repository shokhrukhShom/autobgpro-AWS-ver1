
import { drawCanvas } from "./canvas_mouse.js";

export let headerBarHeight = 0; // Default height of the header bar
let headerOpacity = 1; // Default opacity (50%)
export let headerBarColor = `rgba(0, 0, 0, ${headerOpacity});` // Semi-transparent black

//Add event listeners to adjust the height and color of the transparent bar.
export let headerOpacityInput = document.getElementById('header-opacity');
let headerOpacityValue = document.getElementById('header-opacity-value');
let headerHeightInput = document.getElementById('header-height');
let headerHeightValue = document.getElementById('header-height-value');
export let headerColorInput = document.getElementById('header-color');


// New Code ------------------------
// export function setHeaderBarValues(height, color, opacity) {
//     headerBarHeight = height;
//     headerBarColor = color;
//     headerOpacity = opacity;
//     console.log("setHeaderBarValues initiated");
// }

// End New Code ---------------------


// Update the header opacity
headerOpacityInput.addEventListener('input', (e) => {
    headerOpacity = parseFloat(e.target.value);
    headerOpacityValue.textContent = headerOpacity;
    updateHeaderBarColor();
    triggerCanvasRedraw(); // Trigger a redraw of the canvas
});

// Adjust the bar height
headerHeightInput.addEventListener('input', (e) => {
    headerBarHeight = parseInt(e.target.value, 10);
    headerHeightValue.textContent = headerBarHeight;
    triggerCanvasRedraw(); // Trigger a redraw of the canvas
});

// Update the header bar color dynamically
headerColorInput.addEventListener('input', () => {
    updateHeaderBarColor();
    triggerCanvasRedraw(); // Trigger a redraw of the canvas
});

// Function to update the `headerBarColor`
function updateHeaderBarColor() {
    const color = headerColorInput.value;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    headerBarColor = `rgba(${r}, ${g}, ${b}, ${headerOpacity})`;
}



// Adjust bar color
document.getElementById('header-color').addEventListener('input', (e) => {
    
    const color = e.target.value;
    headerBarColor = `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${headerOpacity})`; // Hex to RGBA
    triggerCanvasRedraw(); // Trigger a redraw of the canvas
});




// Function to trigger a canvas redraw
function triggerCanvasRedraw() {
    // Dispatch a custom event to notify canvas_mouse.js to redraw the canvas
    const event = new CustomEvent('canvasRedraw', {
        detail: {
            headerBarColor,
            headerBarHeight
        }
    });
    document.dispatchEvent(event);
}