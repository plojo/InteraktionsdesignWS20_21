window.addEventListener("load", handleLoad);

function handleLoad(_event) {
    var modal = document.getElementById("imgModal");

    var imgs = document.getElementsByClassName("modalImg");
    console.log(imgs);
    var modalImg = document.getElementById("img01");
    // var captionText = document.getElementById("caption");
    for (const img of imgs) {
        console.log(img);
        img.onclick = function () {
            modal.style.display = "block";
            modalImg.src = this.src;
    }
        // captionText.innerHTML = this.alt;
    }
    modal.onclick = function () {
        modal.style.display = "none";
    }
}