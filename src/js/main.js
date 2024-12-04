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
