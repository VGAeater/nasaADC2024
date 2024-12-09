import { data } from "./data.js";
import { scene } from "./scene.js";
import { minimap } from "./minimap.js";

var dataObject;
var sceneObject, minimapObject;
var shared = {
	isDragging: false,
	time: 0,
	trackBonus: false
};

window.onload = () => {
	dataObject = new data();
	sceneObject = new p5(scene(dataObject, shared));
	minimapObject = new p5(minimap(dataObject, shared));
}

// Function to open the menu
function openMenu() {
	const menu = document.getElementById("menu");
	if (menu) {
	  menu.classList.toggle("hidden");
	}
   }
   
   
   // Listen for messages from the WebView
   document.addEventListener("message", (event) => {
	console.log("Received message from React Native: " + event.data);
	openMenu();
   });
   
   
   // For iOS WebView (since it uses `window.ReactNativeWebView` for communication)
   window.addEventListener("message", (event) => {
	console.log("Received message from React Native: " + event.data);
	openMenu();
   });