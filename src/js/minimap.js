import * as c from "./constants.js";

export const minimap = ( dataObject, shared ) => ( p ) => {
	var main = document.getElementById('minimap');
	var tab = document.getElementById('minimaptab');
	var canvas = document.getElementById('minimapcanvas');
	var minimapCheckboxDOM = document.getElementById('minimapcheckbox');

	var offsetX, offsetY;

	p.setup = () => {
		p.createCanvas(320, 320, p.P2D, canvas);	// create the minimap canvas
		p.background(255, 255, 0);		// clear background minimap canvas
	}

	p.draw = () => {}

	tab.onmousedown = e => {
		shared.isDragging = true;			// indicate that the minimap is being dragged
		// set the original offset between the mouse and the top left corner of the minimap
		offsetX = e.clientX - main.offsetLeft;
		offsetY = e.clientY - main.offsetTop;
	};

	// reset minimap position when window is resized
	window.onresize = () => {
		main.style.top = "0px";
		main.style.right = "0px";		// put it on the right cuz it looks good
		main.style.left = "";
	};

	document.onmousemove = e => {
		if (!shared.isDragging) return;		// check if actualy dragging

		// calculate the minimap position based on the mouse position and the original offset
		main.style.left = e.clientX - offsetX + 'px';
		main.style.top = e.clientY - offsetY + 'px';
	};

	document.onmouseup = () => { shared.isDragging = false; };	// indicate that we are done dragging

	minimapCheckboxDOM.oninput = e => { main.classList.toggle('hidden', !minimapCheckboxDOM.checked); }
}
