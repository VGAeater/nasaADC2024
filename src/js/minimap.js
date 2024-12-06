import * as c from "./constants.js";

export const minimap = ( dataObject, s ) => ( p ) => {

	const orbitData = [
		[[227, 139, 73], 0],				//EDL part 1
		[[241, 64, 42], 115],				//orbiting earth
		[[40, 169, 221], 1497],				// to the moon
		[[255, 255, 255], 7093],			//back to earth
		[[227, 139, 73], 12960]				//EDL part 2
	];

	// declare and set DOM object references
	var main = document.getElementById('minimap');
	var tab = document.getElementById('minimaptab');
	var canvas = document.getElementById('minimapcanvas');
	var minimapCheckboxDOM = document.getElementById('minimapcheckbox');

	var offsetX, offsetY;

	var trackedTouch;
	var hasDragged = false;

	var pgBase = p.createGraphics(320, 320);		// pre graphic for base outline
	var pgBonus = p.createGraphics(320, 320);		// pre graphic for bonus bonoutline

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

		pgBase.strokeWeight(2);
		pgBonus.strokeWeight(2);

		pgBase.background(0);
		pgBonus.background(0);

		p.noFill();
		p.strokeWeight(2);
	}

	p.draw = () => {
		if (!(dataObject.baseReady && dataObject.bonusReady) || !minimapCheckboxDOM.checked)	// stall until the data has been loaded (kinda hacky solution)
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
		p.translate(0, -320);

		let baseData = dataObject.dataWeightedAverage(dataObject.baseArr, s.time);
		let bonusData = dataObject.dataWeightedAverage(dataObject.bonusArr, s.time);

		let currData = s.trackBonus ? bonusData : baseData;

		p.image(s.trackBonus ? pgBonus : pgBase, 0, 0);

		let [x, y] = spaceToCanvas(currData[c.arrayProbeStart], currData[c.arrayProbeStart+2]);
		p.stroke(0, 255, 255);
		p.triangle(x, y, x - 6, y + 0.866025405 * 12, x + 6, y + 0.866025405 * 12);

		[x, y] = spaceToCanvas(bonusData[c.arrayMoonStart], bonusData[c.arrayMoonStart+2]);
		p.stroke(255);
		p.triangle(x, y, x - 6, y + 0.866025405 * 12, x + 6, y + 0.866025405 * 12);
	}

	tab.onmousedown = e => {
		s.isDragging = true;				// indicate that the minimap is being dragged

		// set the original offset between the mouse and the top left corner of the minimap
		offsetX = e.clientX - main.offsetLeft;
		offsetY = e.clientY - main.offsetTop;
	};

	document.onmousemove = e => {
		if (!s.isDragging || trackedTouch) return;	// check if actualy dragging

		// calculate the minimap position based on the mouse position and the original offset
		main.style.left = Math.min(Math.max(e.clientX - offsetX, -280), window.innerWidth-40) + 'px';
		main.style.top = Math.min(Math.max(e.clientY - offsetY, 0), window.innerHeight-40) + 'px';

		hasDragged = true;
	};

	// indicate that we are done dragging
	document.onmouseup = () => {
		// collapse if it never dragged
		if (!hasDragged && s.isDragging)
			main.classList.toggle('collapsed');
		hasDragged = false;

		s.isDragging = false;
	};

	// handle touch /* all touch functions are modified versions of the amazing examples on MDN Docs https://developer.mozilla.org/en-US/docs/Web/API/Touch_events */
	tab.ontouchstart = e => {
		if (trackedTouch) return;			// only allow one touch to take effect canceling if already tracking one

		e.preventDefault();
		const touches = e.changedTouches;

		trackedTouch = touches[0].identifier;
		offsetX = touches[0].pageX - main.offsetLeft;
		offsetY = touches[0].pageY - main.offsetTop;
	}


	document.ontouchmove = e => {
		e.preventDefault();
		const touches = e.changedTouches;

		for (let i = 0; i < touches.length; i++) {
			if (touches[i].identifier != trackedTouch) continue;	// only tracking one touch

			main.style.left = Math.min(Math.max(touches[i].pageX - offsetX, -280), window.innerWidth-40) + 'px';
			main.style.top = Math.min(Math.max(touches[i].pageY - offsetY, 0), window.innerHeight-40) + 'px';

			s.isDragging = true;
			return;
		}
	}

	document.ontouchend = document.ontouchcancel = e => {
		e.preventDefault();
		const touches = e.changedTouches;

		for (let i = 0; i < touches.length; i++) {
			if (touches[i].identifier != trackedTouch) continue;	// only tracking one touch

	  		trackedTouch = undefined;		// remove it; we're done
			s.isDragging = false;

			// collapse if it never dragged
			if (!hasDragged)
				main.classList.toggle('collapsed');
			hasDragged = false;
			return;
		}
	}

	// reset minimap position when window is resized
	window.onresize = () => {
		main.style.bottom = "0px";
		main.style.right = "0px";			// put it on the right cuz it looks good
		main.style.left = "";
	};

	minimapCheckboxDOM.oninput = e => { main.classList.toggle('hidden', !minimapCheckboxDOM.checked); }
}
