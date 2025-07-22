document.getElementById('fileInput').addEventListener('change', handleFileSelect);

document.getElementById('fileInput').addEventListener('change', handleFileSelect);

let fileArray = [];

async function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    const imageContainer = document.getElementById('imageContainer');

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        fileArray.push(file);

        await readFile(file, fileArray.length - 1, imageContainer);
    }

    updateIndices();
    updateFileArray();
}

function readFile(file, index, container) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function(e) {
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'image-wrapper';
            imageWrapper.draggable = true;
            imageWrapper.setAttribute('data-index', index);

            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = file.name;

            const removeButton = document.createElement('button');
            removeButton.className = 'remove-btn';
            removeButton.innerHTML = 'X';
            removeButton.addEventListener('click', function() {
                const fileIndex = Array.from(container.children).indexOf(imageWrapper);
                fileArray.splice(fileIndex, 1);
                container.removeChild(imageWrapper);
                updateIndices();
                updateFileArray();
            });

            imageWrapper.appendChild(img);
            imageWrapper.appendChild(removeButton);
            container.appendChild(imageWrapper);

            addDragAndDropHandlers(imageWrapper);
            resolve();
        };

        reader.onerror = reject;

        reader.readAsDataURL(file);
    });
}

function addDragAndDropHandlers(element) {
    element.addEventListener('dragstart', handleDragStart);
    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('dragenter', handleDragEnter);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);
    element.addEventListener('dragend', handleDragEnd);
}

let dragSrcEl = null;

function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);

    this.classList.add('dragging');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (this !== dragSrcEl) {
        this.classList.add('over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (dragSrcEl !== this) {
        const parent = this.parentNode;

        if (dragSrcEl.nextSibling === this) {
            parent.insertBefore(this, dragSrcEl);
        } else if (this.nextSibling === dragSrcEl) {
            parent.insertBefore(dragSrcEl, this);
        } else {
            parent.insertBefore(dragSrcEl, this.nextSibling);
            parent.insertBefore(this, dragSrcEl);
        }

        updateIndices();
        updateFileArray();
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    const items = document.querySelectorAll('.image-wrapper');
    items.forEach(function(item) {
        item.classList.remove('over');
    });
}

function updateIndices() {
    const items = document.querySelectorAll('.image-wrapper');
    items.forEach((item, index) => {
        item.setAttribute('data-index', index);
    });
}

function updateFileArray() {
    const items = document.querySelectorAll('.image-wrapper img');
    const newArray = Array.from(items).map(img => {
        return fileArray.find(file => file.name === img.alt);
    });
    fileArray.length = 0;
    Array.prototype.push.apply(fileArray, newArray);
    console.log("Updated fileArray:", fileArray.map(file => file.name));
}

// this function not used in the app at the moment
document.getElementById('sanityCheckButton').addEventListener('click', function() {
    

    console.log("Sanity check fileArray:", fileArray.map(file => file.name));
});


