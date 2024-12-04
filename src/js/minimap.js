import * as c from "./constants.js";

export const minimap = ( dataObject, shared ) => ( p ) => {
	const orbitData = [
		[[227, 139, 73], 0],			//EDL part 1
		[[241, 64, 42], 115],			//orbiting earth
		[[40, 169, 221], 1497],			// to the moon
		[[255, 255, 255], 7093],		//back to earth
		[[227, 139, 73], 12960]			//EDL part 2
	];

	// declare and set DOM object references
	var main = document.getElementById('minimap');
	var tab = document.getElementById('minimaptab');
	var canvas = document.getElementById('minimapcanvas');
	var minimapCheckboxDOM = document.getElementById('minimapcheckbox');

	var offsetX, offsetY;

	var pgBase, pgBonus;

	var doneDrawing = false;

	function spaceToCanvas(x, y) {
		let coeff = 320 / 427970.9797;
		return [(x + 415970.9797) * coeff, (y + 242822.395) * coeff];
	}

	function drawPath(pInst, arr, selector, start=0, end=null) {
		if (end == null)
			end = arr[0].length-1;
		for (let i = start; i < end; i++) {
			let [x1, y1] = spaceToCanvas(arr[selector][i], arr[selector+2][i]);
			let [x2, y2] = spaceToCanvas(arr[selector][i+1], arr[selector+2][i+1]);
			pInst.line(x1, y1, x2, y2);
		}
	}

	p.setup = () => {
		p.createCanvas(320, 320, p.P2D, canvas);	// create the minimap canvas
		pgBase = p.createGraphics(320, 320);	// pre graphic for base outline
		pgBonus = p.createGraphics(320, 320);	// pre graphic for bonus bonoutline

		pgBase.strokeWeight(4);
		pgBonus.strokeWeight(4);

		pgBase.background(0);
		pgBonus.background(0);
	}

	p.draw = () => {
		if (!(dataObject.baseReady && dataObject.bonusReady))	// stall until the data has been loaded (kinda hacky solution)
			return;

		if (!doneDrawing) {
			pgBase.stroke(255, 255, 0);
			pgBonus.stroke(255, 255, 0);

			drawPath(pgBase, dataObject.bonusArr, c.arrayMoonStart);
			drawPath(pgBonus, dataObject.bonusArr, c.arrayMoonStart);

			for (let i = 0; i < orbitData.length; i++) {
				pgBase.stroke(orbitData[i][0]);
				drawPath(pgBase, dataObject.baseArr, c.arrayProbeStart, orbitData[i][1], orbitData[i+1] ? orbitData[i+1][1] : null);
			}

			for (let i = 0; i < orbitData.length; i++) {
				pgBonus.stroke(orbitData[i][0]);
				drawPath(pgBonus, dataObject.bonusArr, c.arrayProbeStart, orbitData[i][1], orbitData[i+1] ? orbitData[i+1][1] : null);
			}
			doneDrawing = true;
		}

		p.scale(1, -1);
		p.image(pgBase, 0, -320);


	}

	tab.onmousedown = e => {
		shared.isDragging = true;		// indicate that the minimap is being dragged
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
