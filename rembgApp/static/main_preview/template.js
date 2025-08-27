document.addEventListener('DOMContentLoaded', function() {
    setupTemplateDropdown();
    
    const templateLi = document.getElementById('template');
    if (templateLi) {
        templateLi.addEventListener('click', toggleTemplateDropdown);
    }
});

function setupTemplateDropdown() {
    const templateDropdown = document.getElementById('template-dropdown');
    if (!templateDropdown) return;
    
    document.addEventListener('click', function(event) {
        if (!event.target.closest('#template')) {
            templateDropdown.style.display = 'none';
        }
    });
}

function toggleTemplateDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('template-dropdown');
    if (!dropdown) return;
    
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    if (dropdown.style.display === 'block') {
        loadTemplates();
    }
}

async function loadTemplates() {
    const templateList = document.getElementById('template-list');
    if (!templateList) return;
    
    templateList.innerHTML = '<div class="template-item">Loading templates...</div>';
    
    try {
        const response = await fetch('/get_templates/');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.templates?.length > 0) {
            renderTemplateList(data.templates);
        } else {
            templateList.innerHTML = '<div class="template-item">No templates found</div>';
        }
    } catch (error) {
        console.error('Error loading templates:', error);
        templateList.innerHTML = '<div class="template-item">Error loading templates</div>';
    }
}

// function renderTemplateList(templates) {
//     const templateList = document.getElementById('template-list');
//     if (!templateList) return;
    
//     templateList.innerHTML = '';
    
//     templates.forEach(template => {
//         const templateItem = document.createElement('div');
//         templateItem.className = 'template-item';
//         templateItem.textContent = template.name;

//         templateItem.addEventListener('click', (e) => {
//             e.stopPropagation();
//             loadTemplateMetadata(template.id);
//         });
//         templateList.appendChild(templateItem);
//     });
// }

function renderTemplateList(templates) {
    const templateList = document.getElementById('template-list');
    if (!templateList) return;
    
    templateList.innerHTML = '';
    
    templates.forEach(template => {
        const templateItem = document.createElement('div');
        templateItem.className = 'template-item';
        
        // Create container for template name and delete button
        const templateContent = document.createElement('div');
        templateContent.className = 'template-content';
        templateContent.textContent = template.name;
        
        // Create delete button
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'template-delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Delete template';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDeleteConfirmation(template.id, template.name);
        });
        
        templateItem.appendChild(templateContent);
        templateItem.appendChild(deleteBtn);
        templateItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('template-delete-btn')) {
                e.stopPropagation();
                loadTemplateMetadata(template.id);
            }
        });
        
        templateList.appendChild(templateItem);
    });
}

function showDeleteConfirmation(templateId, templateName) {
    const modal = document.createElement('div');
    modal.className = 'delete-confirmation-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <p>Are you sure you want to delete template "${templateName}"?</p>
            <div class="modal-buttons">
                <button class="confirm-delete">Yes, Delete</button>
                <button class="cancel-delete">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.confirm-delete').addEventListener('click', () => {
        deleteTemplate(templateId);
        modal.remove();
    });
    
    modal.querySelector('.cancel-delete').addEventListener('click', () => {
        modal.remove();
    });
}

async function deleteTemplate(templateId) {
    try {
        const response = await fetch(`/delete_template/${templateId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Reload the template list after deletion
        loadTemplates();
    } catch (error) {
        console.error('Error deleting template:', error);
        alert('Failed to delete template. Please check console for details.');
    }
}

// Add this to your existing getCSRFToken function if not already present
function getCSRFToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


let templateMetadata = {};

async function loadTemplateMetadata(templateId) {
    try {
        const response = await fetch(`/get_template/${templateId}/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        templateMetadata = {
            ...data,
            id: templateId,  // Include template ID in the metadata
            background_path: data.background_path || null  // Ensure background_path is included
        };

        templateMetadata = data;
        //console.log("template metadata: ", templateMetadata)
        const dropdown = document.getElementById('template-dropdown');
        if (dropdown) dropdown.style.display = 'none';

        // call the function to select pictures
        template_select();
        
    } catch (error) {
        console.error('Error loading template metadata:', error);
        //alert('Failed to load template metadata. Please check console for details.');
    }
}



function template_select(){
    
    console.log("template_select clicked");
    // hide canvas edit button
    const canvasEditBtns = document.querySelectorAll('#canvasEditBtn');
    canvasEditBtns.forEach(btn => {
        btn.style.display = "none";
    });
    
    // Hide those elements
    document.getElementById("tool_bar").style.display = "none";
    document.getElementById("main_preview").style.display = "none";
    document.getElementById("select-canvas").style.display = "block";
    const canvases = document.querySelectorAll(".canvas-item");
    let selectedPicturesTemplate = []

     // Show checkmarks
     document.querySelectorAll(".checkmark").forEach(checkmark => {
        checkmark.style.display = "block";
    });



    // backToMain page reloads (Other ways giving bugs =(...)
    document.querySelectorAll(".backToMain").forEach(btn => {
        btn.addEventListener("click", () => {
            location.reload();
        });
    });

    // replace nextTextBtn to applyTemplet and assign that to applyTemp const
    const applyTemp = document.getElementById('nextTextBtn');
    applyTemp.id = 'applyTemplet'

    // Toggle selection when clicking a canvas
    canvases.forEach(canvas => {
        canvas.addEventListener("click", function() {
            canvas.classList.toggle("selected");
            // const checkmark = canvas.querySelector(".checkmark");
            // checkmark.style.display = canvas.classList.contains("selected") ? "flex" : "block";
        });
    });

    // Select all canvases
    selectAllBtn.addEventListener("click", function() {
        const allSelected = [...canvases].every(c => c.classList.contains("selected"));
        canvases.forEach(canvas => {
            canvas.classList.toggle("selected", !allSelected);
            //canvas.querySelector(".checkmark").style.display = !allSelected ? "flex" : "none";
        });
    });

    // applyTemp button clicked, Proceed with selected canvases
    applyTemp.addEventListener("click", function() {
        const selectedCanvases = document.querySelectorAll(".canvas-item.selected");
        
        if (selectedCanvases.length === 0) {
            showError("Error: Please select at least one picture.", 'red')
            return;
        }

        // set disableFetchMetadata to true
        window.disableFetchMetadata = false; // Disable metadata fetching for text editing // it yas true
        console.log("disableFetchMetadata rmbg.js:", window.disableFetchMetadata);
        window.selectedCanvas = []; // also new

        //console.log("Selected canvases:", selectedCanvases);
        // Log the src of each selected canvas
        selectedCanvases.forEach(span => {
            const src = span.src;
            // let cleanSrc = "http://127.0.0.1:8000/"+src.split('?')[0];
            let cleanSrc = window.location.origin + src.split('?')[0];
            selectedPicturesTemplate.push(cleanSrc); // get the image src 
        });

        const no_container = document.getElementById("no_container");
        if(no_container) {no_container.id = "omg_container";}
        
        // console.log("Selected pictures:", selectedPicturesTemplate); // Log the array
        // console.log("Template ID: ", templateId);
        

        save_selected_pictures_with_new_template(selectedPicturesTemplate);

    });
    
};

async function save_selected_pictures_with_new_template(selectedPicturesTemplate){
    console.log("(inside save func) Selected pictures:", selectedPicturesTemplate); // Log the array
    console.log("(inside save func) Template ID: ", templateMetadata.id);
    console.log("(inside save func) Template metadata: ", templateMetadata);
    console.log("templateBG path: ", templateMetadata.background_path);

    showLoadingSpinner("Applying template, please wait...");

    selectedPicturesTemplate = selectedPicturesTemplate.map(url => 
        //url.replace('http://127.0.0.1:8000', '')
        url.replace(window.location.origin, '')
    );
    console.log("(inside save func) Selected pictures without http:", selectedPicturesTemplate);

    try {

        // if Background exist, update Uploaded_Pictures modules bg path
        if (templateMetadata.background_path) {
            // First, update the background image in Uploaded_Pictures
            const updateBgResponse = await fetch('update_background', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify({
                    project_id: window.project_id,
                    background_path: templateMetadata.background_path
                })
            });

            if (!updateBgResponse.ok) {
                throw new Error(`Failed to update background image: ${updateBgResponse.status}`);
            }
        } 


        // save the template metadata
        const response = await fetch('save_metadata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'), // Ensure you have CSRF token
            },
            body: JSON.stringify({
                elements: selectedPicturesTemplate.map(pic => ({
                    image_path: pic,
                    design_data: {
                        header: {
                            height: templateMetadata.header_height,
                            color: templateMetadata.header_color,
                            opacity: templateMetadata.header_opacity,
                        },
                        footer: {
                            height: templateMetadata.footer_height,
                            color: templateMetadata.footer_color,
                            opacity: templateMetadata.footer_opacity,
                        },
                        texts: (templateMetadata.texts || []),
                        logo_path: templateMetadata.logo_path,
                        logo_x: templateMetadata.logo_x,
                        logo_y: templateMetadata.logo_y,
                        logo_scale: templateMetadata.logo_scale,
                        background_path: templateMetadata.background_path, // include background
                    }
                })),
                project_id: window.project_id 
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Save response:", data);

        // Hide loading spinner before redirecting
        hideLoadingSpinner();
        
        // Redirect to rmbg page with refresh
        window.location.href = '/rmbg';

    } catch (error) {
        console.error('Error saving metadata:', error);
        showError("Failed to save template. Please try again.", 'red');
    }

}

// Helper function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


function showLoadingSpinner(textMessage) {
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
    message.textContent = textMessage; //"Processing... Please do not reload the page.";
    message.style.color = "white";
    message.style.marginTop = "10px";
    message.style.fontSize = "16px";
    message.style.padding = "10px";
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
};

function hideLoadingSpinner() {
    const spinnerContainer = document.getElementById("spinner-container");
    if (spinnerContainer) {
        spinnerContainer.remove();
    }
};