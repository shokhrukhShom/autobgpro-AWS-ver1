import { getCanvasStateDesign, updateCanvasStateDesign } from './metadata_fetch.js';


document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Loaded from rembg.js");

    initializeLogoSelect();

})


export function initializeLogoSelect() {
    const selectLogoBtn = document.getElementById('select-logo-btn');
    const logoModal = document.getElementById('logo-selector-modal');
    const logoGrid = document.getElementById('logo-grid');
    const cancelLogoSelect = document.getElementById('cancel-logo-select');


    cancelLogoSelect.style.border = "1px solid #007bff";
    cancelLogoSelect.style.borderRadius = "4px";
    cancelLogoSelect.style.background = "#f8f9fa";

    if (!selectLogoBtn || !logoModal || !logoGrid) return;

    selectLogoBtn.addEventListener('click', function() {
        loadAvailableLogos();
        logoModal.classList.remove('hidden');
    });

    cancelLogoSelect.addEventListener('click', function() {
        logoModal.classList.add('hidden');
    });

    function loadAvailableLogos() {
        logoGrid.innerHTML = '<div class="loading-logos">Loading logos...</div>';
        
        fetch('/get_available_logos/')
            .then(response => response.json())
            .then(data => {
                if (data.logos?.length > 0) {
                    renderLogoGrid(data.logos);
                } else {
                    logoGrid.innerHTML = '<div class="no-logos">No logos found</div>';
                }
            })
            .catch(error => {
                console.error('Error loading logos:', error);
                logoGrid.innerHTML = '<div class="error-loading">Error loading logos</div>';
            });
    }

    function renderLogoGrid(logos) {
        logoGrid.innerHTML = '';
        
        logos.forEach(logo => {
            const logoItem = document.createElement('div');
            logoItem.className = 'logo-item';
            
            const imgContainer = document.createElement('div');
            imgContainer.className = 'logo-img-container';
            
            const img = document.createElement('img');
            img.src = logo.url;
            img.alt = 'Logo';
            img.className = 'logo-thumbnail';
            img.dataset.path = logo.path;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-logo-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = 'Delete this logo';
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showDeleteConfirmation(logo.path);
            });
            
            img.addEventListener('click', function() {
                document.querySelectorAll('.logo-thumbnail').forEach(thumb => {
                    thumb.classList.remove('selected-logo');
                });
                img.classList.add('selected-logo');
                handleLogoSelection(logo);
            });
            
            imgContainer.appendChild(img);
            imgContainer.appendChild(deleteBtn);
            logoItem.appendChild(imgContainer);
            logoGrid.appendChild(logoItem);
        });
    }

    function showDeleteConfirmation(logoPath) {
        const modal = document.createElement('div');
        modal.className = 'delete-confirmation-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <p>Delete this logo permanently?</p>
                <div class="modal-actions">
                    <button class="confirm-delete">Delete</button>
                    <button class="cancel-delete">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.confirm-delete').addEventListener('click', () => {
            deleteLogo(logoPath);
            modal.remove();
        });
        
        modal.querySelector('.cancel-delete').addEventListener('click', () => {
            modal.remove();
        });
    }

    // function getCSRFToken() {
    //     // Try cookies first
    //     const cookieMatch = document.cookie.match(/csrftoken=([^;]+)/);
    //     if (cookieMatch) return cookieMatch[1];
        
    //     // Then try meta tag
    //     const metaTag = document.querySelector('meta[name="csrf-token"]');
    //     if (metaTag) return metaTag.content;
        
    //     // If still not found, check for Django's default form token
    //     const formToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
    //     if (formToken) return formToken.value;
        
    //     console.error('CSRF token not found in cookies, meta tags, or forms');
    //     showError('Session error - please refresh the page', 'red');
    //     return null;
    // }

    // async function deleteLogo(logoPath) {
    //     try {
    //         showLoadingSpinner('Deleting logo...');
            
    //         // Get fresh CSRF token
    //         const csrfToken = getCSRFToken();
    //         if (!csrfToken) {
    //             throw new Error('CSRF token not found');
    //         }
    
    //         const response = await fetch('/delete_logo/', {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'X-CSRFToken': csrfToken
    //             },
    //             body: JSON.stringify({ 
    //                 logo_path: logoPath,
    //                 csrfmiddlewaretoken: csrfToken
    //             })
    //         });
            
    //         if (!response.ok) {
    //             const error = await response.text();
    //             if (error.includes('CSRF')) {
    //                 throw new Error('Session expired. Please refresh the page.');
    //             }
    //             throw new Error(error);
    //         }
            
    //         const data = await response.json();
    //         if (data.success) {
    //             showError('Logo deleted successfully', 'green');
    //             loadAvailableLogos();
                
    //             // Clear if deleted logo was selected
    //             const state = getCanvasStateDesign();
    //             if (state.logo?.path === logoPath) {
    //                 updateCanvasStateDesign({
    //                     logo: {
    //                         image: null,
    //                         x: 100,
    //                         y: 100,
    //                         scale: 0.1,
    //                         path: null
    //                     }
    //                 });
    //                 canvasDrawLogo();
    //             }
    //         } else {
    //             throw new Error(data.error || 'Failed to delete logo');
    //         }
    //     } catch (error) {
    //         console.error('Delete error:', error);
    //         showError(error.message, 'red');
    //     } finally {
    //         hideLoadingSpinner();
    //     }
    // }

    function getCSRFToken() {
        // Try cookies first
        const cookieMatch = document.cookie.match(/csrftoken=([^;]+)/);
        if (cookieMatch) return cookieMatch[1];
        
        // Then try meta tag
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) return metaTag.content;
        
        // If still not found, check for Django's default form token
        const formToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (formToken) return formToken.value;
        
        console.error('CSRF token not found in cookies, meta tags, or forms');
        showError('Session error - please refresh the page', 'red');
        return null;
    }
    
    async function deleteLogo(logoPath) {
        try {
            showLoadingSpinner('Deleting logo...');
            
            const csrfToken = getCSRFToken();
            if (!csrfToken) {
                throw new Error('Authentication required');
            }
    
            const formData = new FormData();
            formData.append('logo_path', logoPath);
            formData.append('csrfmiddlewaretoken', csrfToken);
    
            const response = await fetch('/delete_logo/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                },
                body: formData  // Using FormData instead of JSON
            });
            
            if (!response.ok) {
                const error = await response.text();
                if (response.status === 403) {
                    throw new Error('Please refresh the page and try again');
                }
                throw new Error(error || 'Failed to delete logo');
            }
            
            const data = await response.json();
            if (data.success) {
                showError('Logo deleted successfully', 'green');
                loadAvailableLogos();
                
                // Clear if deleted logo was selected
                const state = getCanvasStateDesign();
                if (state.logo?.path === logoPath) {
                    updateCanvasStateDesign({
                        logo: {
                            image: null,
                            x: 100,
                            y: 100,
                            scale: 0.8,
                            path: null
                        }
                    });
                    canvasDrawLogo();
                }
            } else {
                throw new Error(data.error || 'Failed to delete logo');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showError(error.message.includes('refresh') ? error.message : `Error: ${error.message}`, 'red');
        } finally {
            hideLoadingSpinner();
        }
    }

    function handleLogoSelection(logo) {
        const logoImg = new Image();
        logoImg.crossOrigin = "Anonymous";
        logoImg.src = logo.url;

        logoImg.onload = function() {
            updateCanvasStateDesign({
                logo: {
                    image: logoImg,
                    x: 100,
                    y: 100,
                    scale: 0.8,
                    path: logo.path
                }
            });
            canvasDrawLogo();
            logoModal.classList.add('hidden');
            showError("Logo added to design", "green");
        };

        logoImg.onerror = function() {
            showError("Failed to load selected logo", "red");
        };
    }

    function canvasDrawLogo() { //export
        const {logo} = getCanvasStateDesign(); // Get the current canvas state
        const event = new CustomEvent('canvasDrawLogo', { // canvasDrawLogo
            detail: {
                logoImage: logo.image, // Use the logo image from the state
                logoX: logo.x, // Use the logo x position from the state
                logoY: logo.y, // Use the logo y position from the state
                logoScale: logo.scale, // Use the logo scale from the state
            }
            
        });
        document.dispatchEvent(event);
    
    }

    function showLoadingSpinner(msg) {
        // Remove existing spinner if present
        const existingSpinner = document.getElementById('spinner-container');
        if (existingSpinner) {
            existingSpinner.remove();
        }
    
        // Create spinner container
        const spinnerContainer = document.createElement("div");
        spinnerContainer.id = "spinner-container";
        spinnerContainer.style.position = "fixed";
        spinnerContainer.style.top = "0";
        spinnerContainer.style.left = "0";
        spinnerContainer.style.width = "100%";
        spinnerContainer.style.height = "100%";
        spinnerContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        spinnerContainer.style.display = "flex";
        spinnerContainer.style.flexDirection = "column";
        spinnerContainer.style.justifyContent = "center";
        spinnerContainer.style.alignItems = "center";
        spinnerContainer.style.zIndex = "9999";
    
        // Create spinner
        const spinner = document.createElement("div");
        spinner.style.border = "8px solid #f3f3f3";
        spinner.style.borderTop = "8px solid #3498db";
        spinner.style.borderRadius = "50%";
        spinner.style.width = "60px";
        spinner.style.height = "60px";
        spinner.style.animation = "spin 1s linear infinite";
        spinnerContainer.appendChild(spinner);
    
        // Create message
        const message = document.createElement("p");
        message.textContent = msg;
        message.style.color = "white";
        message.style.marginTop = "20px";
        message.style.fontSize = "16px";
        message.style.textAlign = "center";
        message.style.maxWidth = "300px";
        spinnerContainer.appendChild(message);
    
        // Add spinner container to the body
        document.body.appendChild(spinnerContainer);
    
        // Add CSS animation for spinner
        const style = document.createElement("style");
        style.innerHTML = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    function hideLoadingSpinner() {
        // Implement hiding spinner
        const spinner = document.getElementById('spinner-container');
        if (spinner) {
            spinner.remove();
        }
        
        // Also remove the style element we added
        const spinStyle = document.querySelector('style');
        if (spinStyle && spinStyle.innerHTML.includes('@keyframes spin')) {
            spinStyle.remove();
        }
        
    }

    
} // end of initializeLogoSelect function

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

