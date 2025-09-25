<div id="softPopup" style="display:none; position:fixed; inset:0; background-color:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center;">
  <div style="background:white; color:black; padding:1rem; border-radius:8px; max-width:500px; width:90%; position:relative; font-family:'Cursive',sans-serif;">
    <button onclick="closeSoftPopup()" style="position:absolute; top:10px; right:15px; background:none; border:none; font-size:20px; color:red;">&times;</button>
    
    <!-- Carousel -->
    <div style="position:relative; overflow:hidden; border-radius:6px; margin-bottom:1rem;">
      <button onclick="prevImage()" style="position:absolute; top:50%; left:0; transform:translateY(-50%); background:none; border:none; font-size:24px; color:goldenrod; cursor:pointer;">&#10094;</button>
      <img id="softPopupImage" src="" alt="" style="width:100%; transition: transform 0.3s ease;">
      <button onclick="nextImage()" style="position:absolute; top:50%; right:0; transform:translateY(-50%); background:none; border:none; font-size:24px; color:goldenrod; cursor:pointer;">&#10095;</button>
    </div>

    <h2 id="softPopupTitle" style="color:goldenrod;"></h2>
    <p id="softPopupDescription" style="margin:1rem 0;"></p>
    <strong id="softPopupPrice" style="color:green"></strong>
  </div>
</div>
