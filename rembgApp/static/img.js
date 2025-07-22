(function() {

    let str = "{{i.images_text}}";
    const img_array = [];
    let word = "";

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === " ") {
            if (word !== "") {
                img_array.push(word);
                word = "";
            }
        } else {
            word += char;
        }
    }

    // Add the last word if there is one
    if (word !== "") {
        img_array.push(word);
    }

    console.log(img_array);

    const galleryDiv = document.getElementById("img-{{i.id}}");
    galleryDiv.innerHTML = img_array.map(src => `<img src="media/images/user_id_{{i.author.id }}/post_id_{{i.id}}/${src}" alt="Image" width="200">`).join('');
    })();