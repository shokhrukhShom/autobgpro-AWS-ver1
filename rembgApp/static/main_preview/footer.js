import { getCanvasStateDesign, updateCanvasStateDesign } from './metadata_fetch.js'; // Importing canvas state management functions

// export let footerHeight = 0; // Default footer height
// let footerOpacity = 1; // Default footer opacity
// export let footerColor = `rgba(0, 0, 0, ${footerOpacity})`; // Default footer color

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
        const height = parseInt(e.target.value, 10);
        const state = getCanvasStateDesign();

        updateCanvasStateDesign({
            footer: {
                ...state.footer,
                height
            }
        });

        footerHeightValue.textContent = height;

        canvasRedrawFooter();
    });

    // Update footer opacity
    footerOpacityInput.addEventListener('input', (e) => {
        const opacity = parseFloat(e.target.value);
        const state = getCanvasStateDesign();
        const rgbaMatch = state.footer.color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        const [r, g, b] = rgbaMatch ? rgbaMatch.slice(1, 4) : [0, 0, 0];

        updateCanvasStateDesign({
            footer: {
                ...state.footer,
                opacity,
                color: `rgba(${r}, ${g}, ${b}, ${opacity})`
            }
        });

        footerOpacityValue.textContent = opacity;

        canvasRedrawFooter();
    });

    // Update footer color
    footerColorInput.addEventListener('input', (e) => {
        const color = e.target.value;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const state = getCanvasStateDesign();

        updateCanvasStateDesign({
            footer: {
                ...state.footer,
                color: `rgba(${r}, ${g}, ${b}, ${state.footer.opacity})`
            }
        });
        canvasRedrawFooter();
    });

    // Add a new text input section ----------
    const addTextButton = document.getElementById('add-text-btn-footer');
    if (addTextButton && !addTextButton.hasEventListener) {
        addTextButton.hasEventListener = true; // Ensure the listener is only added once
        addTextButton.addEventListener('click', () => {
            //console.log("+ btn clicked");

            const id = footerTextIdCounter++;
            const state = getCanvasStateDesign(); // new

            const textObj = {
                id, // Unique ID
                content: `Text ${id + 1}`,
                fontSize: 60,
                color: '#000000',
                fontFamily: 'Arial', // Default font family
                x: 500,
                y: 150 + id * 40, // Offset each new text vertically
                isDraggingFooterElement: false, // Use isDraggingFooterElement
            };
            updateCanvasStateDesign({
                footer: {
                    ...state.footer,
                    texts: [...state.footer.texts, textObj]
                }
            });

            //footerTexts.push(textObj);
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
                <option value="Palatino" style="font-family: Palatino;">Palatino</option>
                <option value="Garamond" style="font-family: Garamond;">Garamond</option>
                <option value="Bookman" style="font-family: Bookman;">Bookman</option>
                <option value="Comic Sans MS" style="font-family: 'Comic Sans MS';">Comic Sans MS</option>
                <option value="Impact" style="font-family: Impact;">Impact</option>
                <option value="Lucida Console" style="font-family: 'Lucida Console';">Lucida Console</option>
                <option value="Tahoma" style="font-family: Tahoma;">Tahoma</option>
                <option value="Trebuchet MS" style="font-family: 'Trebuchet MS';">Trebuchet MS</option>
                <option value="Arial Black" style="font-family: 'Arial Black';">Arial Black</option>
                <option value="Lucida Sans Unicode" style="font-family: 'Lucida Sans Unicode';">Lucida Sans Unicode</option>
                <option value="MS Sans Serif" style="font-family: 'MS Sans Serif';">MS Sans Serif</option>
                <option value="MS Serif" style="font-family: 'MS Serif';">MS Serif</option>
                <option value="Symbol" style="font-family: Symbol;">Symbol</option>
                <option value="Webdings" style="font-family: Webdings;">Webdings</option>
                <option value="Wingdings" style="font-family: Wingdings;">Wingdings</option>
                <option value="system-ui" style="font-family: system-ui;">System UI</option>
            </select>

            <button id="remove-footer-text-${textObj.id}" style="margin-right: 5px;">Remove</button>
        `;
        // Append the new text section to the footer text list
        footerTextList.appendChild(textSection);

        // Add event listeners to the new text section
        const [textInput, sizeInput, colorInput, fontSelect, removeBtn] = 
        textSection.querySelectorAll('input, select, button');
        fontSelect.value = textObj.fontFamily;

        textInput.addEventListener('input', (e) => updateFooterText(textObj.id, 'content', e.target.value));
        sizeInput.addEventListener('input', (e) => updateFooterText(textObj.id, 'fontSize', parseInt(e.target.value)));
        colorInput.addEventListener('input', (e) => updateFooterText(textObj.id, 'color', e.target.value));
        fontSelect.addEventListener('change', (e) => updateFooterText(textObj.id, 'fontFamily', e.target.value));

        // Remove text functionality
        // document.getElementById(`remove-footer-text-${textObj.id}`).addEventListener('click', () => {
        //     //footerTexts = footerTexts.filter((text) => text.id !== textObj.id);

        //     const state = getCanvasStateDesign();
        //     const newTexts = state.footer.texts.filter(t => t.id !== textObj.id);

        //     updateCanvasStateDesign({
        //         footer: {
        //             ...state.footer,
        //             texts: newTexts
        //         }
        //     });
        //     textSection.style.opacity = "0"; // Fade out

        //     setTimeout(() => {
        //         textSection.remove();
        //         canvasRedrawFooter();
        //     }, 600); // Matches CSS transition time
        // });

        // Remove button functionality
        removeBtn.addEventListener('click', () => {
            const state = getCanvasStateDesign();
            const newTexts = state.footer.texts.filter(t => t.id !== textObj.id);

            updateCanvasStateDesign({
                footer: {
                    ...state.footer,
                    texts: newTexts
                }
            });

            textSection.style.opacity = '0';
            setTimeout(() => textSection.remove(), 500);
            canvasRedrawFooter();
        });


        // Add the new text object to the footerTexts array
        function updateFooterText(id, key, value) {
        const state = getCanvasStateDesign();
        const updatedTexts = state.footer.texts.map(text =>
            text.id === id ? { ...text, [key]: value } : text
        );

        updateCanvasStateDesign({
            footer: {
                ...state.footer,
                texts: updatedTexts
            }
        });

            canvasRedrawFooter(); // Redraw the canvas after adding new text
        }
    }


    // Mouse down event for dragging footer elements
    canvas.addEventListener('mousedown', (e) => {
        const { footer } = getCanvasStateDesign();
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        const updatedTexts = footer.texts.map(text => {
            const textWidth = ctx.measureText(text.content).width;
            const textHeight = text.fontSize;
            const isInBounds =  mouseX >= text.x - textWidth / 2 &&
                                mouseX <= text.x + textWidth / 2 &&
                                mouseY >= text.y - textHeight / 2 &&
                                mouseY <= text.y + textHeight / 2
            if (isInBounds) {
                dragOffsetX = mouseX - text.x;
                dragOffsetY = mouseY - text.y;
                return { ...text, isDraggingFooterElement: true };
            }

            return text;
        });
        updateCanvasStateDesign({ footer: { ...footer, texts: updatedTexts } });
    });

    // Mouse move event for dragging footer elements
    canvas.addEventListener('mousemove', (e) => {
        const { footer } = getCanvasStateDesign();

        // Check if any footer text is being dragged
        if (!footer.texts.some(text => text.isDraggingFooterElement)) return;

        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;  // Scale factor for X
        const scaleY = canvas.height / rect.height; // Scale factor for Y

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY =(e.clientY - rect.top) * scaleY;

        const updatedTexts = footer.texts.map(text => {
            // Check if this text is being dragged
            if (!text.isDraggingFooterElement) return text;
            // Update the position of the dragged text    
            return { ...text, x: mouseX - dragOffsetX, y: mouseY - dragOffsetY };
        });
        // Update the footer texts in the state
        updateCanvasStateDesign({ footer: { ...footer, texts: updatedTexts } });
        // Redraw the canvas
        canvasRedrawFooter();
        
    });


    // Mouse up event to stop dragging
    canvas.addEventListener('mouseup', () => {
        const { footer } = getCanvasStateDesign();
        // set isDraggingFooterElement to false for all texts
        const updatedTexts = footer.texts.map(text => ({ ...text, isDraggingFooterElement: false }));
        updateCanvasStateDesign({ footer: { ...footer, texts: updatedTexts } });
    });

    // Mouse wheel event for resizing footer text
    canvas.addEventListener('wheel', (event) => {
        const { footer } = getCanvasStateDesign();
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;
        
        let updated = false;

        const updatedTexts = footer.texts.map(text => {
            const textWidth = ctx.measureText(text.content).width;
            const textHeight = text.fontSize;
            const isInBounds = mouseX >= text.x - textWidth / 2 &&
                               mouseX <= text.x + textWidth / 2 &&
                               mouseY >= text.y - textHeight / 2 &&
                               mouseY <= text.y + textHeight / 2;

            if (isInBounds) {
                event.preventDefault();
                const newSize = Math.max(10, Math.min(150, text.fontSize + (event.deltaY < 0 ? 0.7 : -0.7)));
                updated = true;
                return { ...text, fontSize: newSize };
            }

            return text;
        });

        if (updated) {
            updateCanvasStateDesign({ footer: { ...footer, texts: updatedTexts } });
            canvasRedrawFooter();
        }

    }, { passive: false });
}

// Function to trigger a redraw of the footer
// This function dispatches a custom event that can be listened to by other parts of the application
// to redraw the footer with the current state.
function canvasRedrawFooter() { // removed the "export:" here
    const state = getCanvasStateDesign();
    const event = new CustomEvent('canvasRedrawFooter', {
        detail: {
            footerHeight: state.footer.height, // Footer height
            footerColor: state.footer.color,   // Footer color
            footerTexts: state.footer.texts // Footer texts
        }
        
    });
    document.dispatchEvent(event);
}