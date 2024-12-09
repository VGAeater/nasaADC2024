import { data } from "./data.js";
import { scene } from "./scene.js";
import { minimap } from "./minimap.js";

const menu = document.getElementById("menu");

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

// Listen for messages from the WebView
// For iOS WebView (since it uses `window.ReactNativeWebView` for communication)
window.onmessage = document.onmessage = e => {
	console.log("Received message from React Native: " + e.data);
	menu.classList.toggle("hidden");
};
