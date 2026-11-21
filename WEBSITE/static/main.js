
const burger = document.getElementById("hamburger");
const menu = document.getElementById("Menu");
const exitbtn = document.getElementById("cancelBtn");

burger.addEventListener("click", function(){
    menu.classList.toggle('active');
});

exitbtn.addEventListener("click", function(){
    menu.classList.remove('active');
});

