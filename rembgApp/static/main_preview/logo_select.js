import { getCanvasStateDesign, updateCanvasStateDesign } from './metadata_fetch.js';


document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Loaded from rembg.js");

    initializeLogoSelect();

})


export function initializeLogoSelect() {
    console.log("logo_select.js initializeLogoSelect!")
    const selectLogoBtn = document.getElementById('select-logo-btn');
    const logoModal = document.getElementById('logo-selector-modal');
    const logoGrid = document.getElementById('logo-grid');
    const cancelLogoSelect = document.getElementById('cancel-logo-select');

    if (!selectLogoBtn || !logoModal || !logoGrid) return;

    // Show logo selector modal
    selectLogoBtn.addEventListener('click', function() {
        loadAvailableLogos();
        logoModal.classList.remove('hidden');
    });

    // Hide logo selector modal
    cancelLogoSelect.addEventListener('click', function() {
        logoModal.classList.add('hidden');
    });

    function loadAvailableLogos() {
        logoGrid.innerHTML = '<p>Loading logos...</p>';
        
        fetch('/get_available_logos/')
            .then(response => response.json())
            .then(data => {
                if (data.logos && data.logos.length > 0) {
                    renderLogoGrid(data.logos);
                } else {
                    logoGrid.innerHTML = '<p>No logos found. Please upload one first.</p>';
                }
            })
            .catch(error => {
                console.error('Error loading logos:', error);
                logoGrid.innerHTML = '<p>Error loading logos. Please try again.</p>';
            });
    }

    function renderLogoGrid(logos) {
        logoGrid.innerHTML = '';
        
        logos.forEach(logo => {
            const logoItem = document.createElement('div');
            logoItem.style.textAlign = 'center';
            
            const img = document.createElement('img');
            img.src = logo.url;
            img.alt = 'Logo';
            img.className = 'logo-thumbnail';
            img.dataset.path = logo.path;
            
            img.addEventListener('click', function() {
                document.querySelectorAll('.logo-thumbnail').forEach(thumb => {
                    thumb.classList.remove('selected-logo');
                });
                
                img.classList.add('selected-logo');
                handleLogoSelection(logo);
                
                setTimeout(() => {
                    logoModal.classList.add('hidden');
                }, 300);
            });
            
            logoItem.appendChild(img);
            logoGrid.appendChild(logoItem);
        });
    }

    function handleLogoSelection(logo) {
        const logoImg = new Image();
        logoImg.crossOrigin = "Anonymous";
        logoImg.src = logo.url;

        logoImg.onload = function() {
            // Update the design state
            const state = getCanvasStateDesign();
            updateCanvasStateDesign({
                logo: {
                    image: logoImg,
                    x: 100, // default x position
                    y: 100, // default y position
                    scale: 0.2 // default scale
                }
            });

            // Dispatch the canvasDrawLogo event
            const event = new CustomEvent('canvasDrawLogo', {
                detail: {
                    logoImage: logoImg,
                    logoX: 100,
                    logoY: 100,
                    logoScale: 0.2
                }
            });
            document.dispatchEvent(event);

            showError("Logo added to visible canvases", "green");
        };

        logoImg.onerror = function() {
            showError("Failed to load the selected logo", "red");
        };
    }
}

// Helper function to show error messages
function showError(message, color) {
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    if (!errorMessage || !errorText) return;
    
    errorText.textContent = message;
    errorMessage.style.backgroundColor = color;
    errorMessage.classList.remove('hidden');
    errorMessage.classList.add('visible');
    
    setTimeout(() => {
        errorMessage.classList.remove('visible');
        errorMessage.classList.add('hidden');
    }, 5000);
}