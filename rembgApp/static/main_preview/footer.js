

export let footerHeight = 0; // Default footer height
let footerOpacity = 1; // Default footer opacity
export let footerColor = `rgba(0, 0, 0, ${footerOpacity})`; // Default footer color

let footerTextIdCounter = 0; // Unique ID counter for footer texts
export let footerTexts = []; // Array to hold footer text objects
export let footerTextList = document.getElementById('footer-text-list');

export let footerColorInput = document.getElementById('footer-color');

export let footerOpacityInput = document.getElementById('footer-opacity');


// Export a function to initialize footer functionality with canvas and ctx
export function initializeFooter(canvas, ctx) { 
    // Footer Bar Elements
    const footerHeightInput = document.getElementById('footer-height');
    const footerHeightValue = document.getElementById('footer-height-value');
    const footerOpacityValue = document.getElementById('footer-opacity-value');
    //const footerColorInput = document.getElementById('footer-color');
    //const footerOpacityInput = document.getElementById('footer-opacity');

    // Track dragging state for footer elements
    let isDraggingFooterElement = false;
    //let draggedFooterElement = null; // The footer element being dragged
    let dragOffsetX = 0; // Offset between mouse and element X
    let dragOffsetY = 0; // Offset between mouse and element Y

    // Update footer height
    footerHeightInput.addEventListener('input', (e) => {
        footerHeight = parseInt(e.target.value, 10);
        footerHeightValue.textContent = footerHeight;
        canvasRedrawFooter();
    });

    // Update footer color
    footerColorInput.addEventListener('input', () => { //(e) removed the (e)
        updateFooterColor();
        canvasRedrawFooter();
    });

    // Update footer opacity
    footerOpacityInput.addEventListener('input', (e) => {
        footerOpacity = parseFloat(e.target.value);
        footerOpacityValue.textContent = footerOpacity;
        updateFooterColor();
        canvasRedrawFooter();
    });

    // Helper to update footer color
    function updateFooterColor() {
        const color = footerColorInput.value;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        footerColor = `rgba(${r}, ${g}, ${b}, ${footerOpacity})`;
    }

    // Add a new text input section ----------
    const addTextButton = document.getElementById('add-text-btn-footer');
    if (addTextButton && !addTextButton.hasEventListener) {
        addTextButton.hasEventListener = true; // Ensure the listener is only added once
        addTextButton.addEventListener('click', () => {
            //console.log("+ btn clicked");

            const id = footerTextIdCounter++;
            const textObj = {
                id, // Unique ID
                content: `Text ${id + 1}`,
                fontSize: 60,
                color: '#000000',
                x: 500,
                y: 150 + id * 40, // Offset each new text vertically
                isDraggingFooterElement: false, // Use isDraggingFooterElement
            };

            footerTexts.push(textObj);
            createTextInputSection(textObj);
            canvasRedrawFooter();
        });
    }

    // Create a new text input section dynamically
    function createTextInputSection(textObj) {
        const textSection = document.createElement('div');
        textSection.id = `footer-text-section-${textObj.id}`;
        textSection.style.marginBottom = '10px';
        textSection.style.transform = "translateY(20px)"; // Start slightly down
        textSection.style.transition = "opacity 0.5s ease, transform 0.8s ease"; // Transition properties

        textSection.style.opacity = "0";
        setTimeout(() => textSection.style.opacity = "1", 10);

        textSection.innerHTML = `
            <label for="footer-text-${textObj.id}">Text:</label>
            <input type="text" id="footer-text-${textObj.id}" value="${textObj.content}" style="margin-right: 5px;">

            <label for="footer-font-size-${textObj.id}">Size:</label>
            <input type="number" id="footer-font-size-${textObj.id}" value="${textObj.fontSize}" min="10" max="100" style="margin-right: 5px;">

            <label for="footer-font-color-${textObj.id}">Color:</label>
            <input type="color" id="footer-font-color-${textObj.id}" value="${textObj.color}" style="margin-right: 5px;">
            
            <label for="footer-font-family">Font:</label>
            <select class="footer-font-family">
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New" style="font-family: 'Courier New';">Courier New</option>
                <option value="Verdana" style="font-family: Verdana;">Verdana</option>
                <option value="Georgia" style="font-family: Georgia;">Georgia</option>
            </select>

            <button id="remove-footer-text-${textObj.id}" style="margin-right: 5px;">Remove</button>
        `;

        document.getElementById('footer-text-list').appendChild(textSection);

        // Set selected font
        const fontSelect = textSection.querySelector(".footer-font-family");
        fontSelect.value = textObj.fontFamily || "Arial"; // Default to Arial if not set

        // Event listener for changing font
        fontSelect.addEventListener("change", (e) => {
            textObj.fontFamily = e.target.value;
            canvasRedrawFooter();
        });

        // Add event listeners to update text properties
        document.getElementById(`footer-text-${textObj.id}`).addEventListener('input', (e) => {
            textObj.content = e.target.value;
            canvasRedrawFooter();
        });

        document.getElementById(`footer-font-size-${textObj.id}`).addEventListener('input', (e) => {
            textObj.fontSize = parseInt(e.target.value, 10);
            canvasRedrawFooter();
        });

        document.getElementById(`footer-font-color-${textObj.id}`).addEventListener('input', (e) => {
            textObj.color = e.target.value;
            canvasRedrawFooter();
        });

        // Remove text functionality
        document.getElementById(`remove-footer-text-${textObj.id}`).addEventListener('click', () => {
            footerTexts = footerTexts.filter((text) => text.id !== textObj.id);
            textSection.style.opacity = "0"; // Fade out

            setTimeout(() => {
                textSection.remove();
                canvasRedrawFooter();
            }, 600); // Matches CSS transition time
        });
    }

    // Mouse down event for dragging footer elements
    canvas.addEventListener('mousedown', (e) => {
        
        const rect = canvas.getBoundingClientRect();
        // const mouseX = e.clientX - rect.left;
        // const mouseY = e.clientY - rect.top;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        footerTexts.forEach((text) => {

            //console.log("Mousedown: ", text.content);

            const textWidth = ctx.measureText(text.content).width;
            const textHeight = text.fontSize;
            if (
                mouseX >= text.x - textWidth / 2 &&
                mouseX <= text.x + textWidth / 2 &&
                mouseY >= text.y - textHeight / 2 &&
                mouseY <= text.y + textHeight / 2
            ) {
                text.isDraggingFooterElement = true; // Use isDraggingFooterElement
                dragOffsetX = mouseX - text.x; // Store the offset between mouse and text X
                dragOffsetY = mouseY - text.y; // Store the offset between mouse and text Y
            }
        });
    });

    // Mouse move event for dragging footer elements
    canvas.addEventListener('mousemove', (e) => {
        if (footerTexts.some((text) => text.isDraggingFooterElement)) { 
            const rect = canvas.getBoundingClientRect();

            const scaleX = canvas.width / rect.width;  // Scale factor for X
            const scaleY = canvas.height / rect.height; // Scale factor for Y

            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY =(e.clientY - rect.top) * scaleY;

            footerTexts.forEach((text) => {
                if (text.isDraggingFooterElement) {
                    text.x = mouseX - dragOffsetX; // Move text relative to initial offset
                    text.y = mouseY - dragOffsetY;
                    // text.x = mouseX - dragOffsetX; // Move text relative to initial offset
                    // text.y = mouseY - dragOffsetY;
                }
            });

            // Redraw the canvas
            canvasRedrawFooter();
        }
    });


    // Mouse up event to stop dragging
    canvas.addEventListener('mouseup', () => {
        footerTexts.forEach((text) => (text.isDraggingFooterElement = false)); // Use isDraggingFooterElement
        //draggedFooterElement = null;
    });

    // Mouse wheel event for resizing footer text
    canvas.addEventListener('wheel', (e) => {
        //console.log("wheel: text working");
        const rect = canvas.getBoundingClientRect();
        // const mouseX = e.clientX - rect.left;
        // const mouseY = e.clientY - rect.top;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;
        

        footerTexts.forEach((text) => {
            const textWidth = ctx.measureText(text.content).width;
            const textHeight = text.fontSize;
            if (
                mouseX >= text.x - textWidth / 2 &&
                mouseX <= text.x + textWidth / 2 &&
                mouseY >= text.y - textHeight / 2 &&
                mouseY <= text.y + textHeight / 2
            ) {
                e.preventDefault();
                text.fontSize += e.deltaY < 0 ? 0.7 : -0.7; // Increase or decrease font size
                text.fontSize = Math.max(10, Math.min(150, text.fontSize)); // Clamp font size
                canvasRedrawFooter();
            }
        });
    }, { passive: false });
}

// Function to trigger a canvas redraw for footer updates
function canvasRedrawFooter() { // removed the "export:" here
    //console.log("Dispatched via canvasRedrawFooter");
    // Dispatch a custom event to notify canvas_mouse.js to redraw the canvas
    //console.log("canvasRedrawFooter triggered");
    
    const event = new CustomEvent('canvasRedrawFooter', {
        detail: {
            footerHeight,  // Footer height
            footerColor,   // Footer color
            footerTexts    // Footer text objects
        }
        
    });
    document.dispatchEvent(event);
}