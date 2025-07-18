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

function renderTemplateList(templates) {
    const templateList = document.getElementById('template-list');
    if (!templateList) return;
    
    templateList.innerHTML = '';
    
    templates.forEach(template => {
        const templateItem = document.createElement('div');
        templateItem.className = 'template-item';
        templateItem.textContent = template.name;
        templateItem.addEventListener('click', (e) => {
            e.stopPropagation();
            loadTemplateMetadata(template.id);
        });
        templateList.appendChild(templateItem);
    });
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
            id: templateId  // Include template ID in the metadata
        };

        templateMetadata = data;
        //console.log("template metadata: ", templateMetadata)
        const dropdown = document.getElementById('template-dropdown');
        if (dropdown) dropdown.style.display = 'none';
        // call the function to select pictures
        template_select();
        
    } catch (error) {
        console.error('Error loading template metadata:', error);
        alert('Failed to load template metadata. Please check console for details.');
    }
}



function template_select(){
    
    console.log("template_select clicked");
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
            let cleanSrc = "http://127.0.0.1:8000/"+src.split('?')[0];
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

    selectedPicturesTemplate = selectedPicturesTemplate.map(url => 
        url.replace('http://127.0.0.1:8000', '')
    );
    console.log("(inside save func) Selected pictures without http:", selectedPicturesTemplate);

    try {
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