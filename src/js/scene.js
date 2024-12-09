import * as c from "./constants.js";
import * as b from "./bonus.js";


export const scene = ( dataObject, s ) => ( p ) => {
	// [color, start, end, base model, bonus model]
	var orbitData = [
		[[227, 139, 73], 0, null, null],		//EDL part 1
		[[241, 64, 42], 115, null, null],		//orbiting earth
		[[40, 169, 221], 1497, null, null],		// to the moon
		[[255, 255, 255], 7093, null, null],		//back to earth
		[[227, 139, 73], 12960, null, null]		//EDL part 2
	];

	var moonPath;						// moon path model that will be built later

	var realTime = false;

	var prevBest = "WPSA";		// Previous best for the priorotized list

	var showAxes = false, showText = false, showAntennaColor = true, useTextures = true, useRocketModel = true;	// state tracking variables for graphical options
	var followEarth = false, followMoon = false, followProbe = false;	// state tracking variables for following
	var playing = false, speed = 10, strokeWeight = 100;	// state tracking variables for simulation speed

	// input dom objects
	const followEarthDOM = document.getElementById("followearth");
	const followMoonDOM = document.getElementById("followmoon");
	const followProbeDOM = document.getElementById("followprobe");

	const timeDOM = document.getElementById("time");
	const strokeDOM = document.getElementById("stroke");
	const speedDOM = document.getElementById("speed");
	const timeSliderDOM = document.getElementById("timeslider");

	const playButtonDOM = document.getElementById("playbutton");

	const overlayLeftDOM = document.getElementById("overlaytextleft");
	const overlayRightDOM = document.getElementById("overlaytextright");


	var showOtherPath = false;				// data selection trackers
	var earthDayTex, earthNightTex, moonTex, cloudsTex;	// the textures for the earth and moon
	var earthShader, moonShader, atmoShader;		// the shaders for the eath, moon, and atmosphere
	var rocketModel;

	// main dom objects
	const canvas = document.getElementById("canvas");
	const canvasdiv = document.getElementById("canvasdiv");
	const menu = document.getElementById("menu");

	var prevbox;						// stores what the previous bounding box of the canvas was

	var camera;

	// move the camera to a certain position keeping the relative camera position
	function goToPosition(x, y, z) {
		let camDeltaX = camera.eyeX - camera.centerX;
		let camDeltaY = camera.eyeY - camera.centerY;
		let camDeltaZ = camera.eyeZ - camera.centerZ;
		camera.camera(x + camDeltaX, y + camDeltaY, z + camDeltaZ, x, y, z, 0, -1, 0);
	}

	/*
	 * draw the path from stated starting point to ending point
	 * ending point defaults to the max index in the array
	 * ment to be run once per path to make the model because its slow
	 */
	function buildPath(arr, selector, start=0, end=null) {
		if (end == null)
			end = arr[0].length-1;
		for (let i = start; i < end; i++)
			p.line(arr[selector][i], arr[selector+1][i], arr[selector+2][i], arr[selector][i+1], arr[selector+1][i+1], arr[selector+2][i+1]);
	}

	// return a color based on how strong the antenna's connection is
	function antennaColor(budget) {
		if (isNaN(budget) || budget == 0)
			return [255, 0, 0, 255 * (Math.sin(p.millis() / 100) + 1) / 2];	// make strobing effect when no signal
		if (budget > 8000)
			return [0, 255, 0];
		if (budget > 4000)
			return [255, 211, 0];
		if (budget > 1000)
			return [255, 140, 0];
		return [255, 0, 0];				// default to red for very weak connections
	}

	function handleRocket(baseData, bonusData) {
		let data = s.trackBonus ? bonusData : baseData;	// switch to bonus data if tracking it

		// set the x y z xv yv and zv for later
		let x = data[c.arrayProbeStart];
		let y = data[c.arrayProbeStart+1];
		let z = data[c.arrayProbeStart+2];

		let xv = data[c.arrayProbeStart+3];
		let yv = data[c.arrayProbeStart+4];
		let zv = data[c.arrayProbeStart+5];

		if (followProbe)				// check if following the probe then go to its position
			goToPosition(x, y, z);

		p.stroke(0,255,255);

		p.push();
		p.translate(x, y, z);
		//rotateZ(createVector(x, y).heading());
		//rotateY(-createVector(x, y).heading());
		//console.log(createVector(x, y, z).angleBetween(createVector(0, 0, 0)));
		if (useRocketModel) {
			p.strokeWeight(1);			// wow wireframe!! 
			p.scale(4);				//looks miscroscopic without scaling up
			p.model(rocketModel);
			p.scale(1);
		} else 
			p.sphere(500, 6, 3);			// change it to a sphere until we get rotation or model
		
		p.pop();

		let veloVectorDistance = Math.hypot(xv, yv, zv);
		if (veloVectorDistance > 7)
			p.stroke(255, 0, 0);
		else if (veloVectorDistance > 5)
			p.stroke(255, 165, 0);
		else if (veloVectorDistance > 3)
			p.stroke(255, 255, 0);
		else
			p.stroke(0, 255, 0);

		p.strokeWeight(strokeWeight * 2);		// double the stroke weight so that the tangent is easier to see
		p.line(x, y, z, x + xv * c.tanMult, y + yv * c.tanMult, z + zv * c.tanMult);
		p.strokeWeight(strokeWeight);

		// checks to see if last path is already created, we do not need a boolean value for this
		if (!orbitData[4][2]) {
			for (let i = 0; i < orbitData.length; i++) {
				p.beginGeometry();
				buildPath(dataObject.baseArr, c.arrayProbeStart, orbitData[i][1], orbitData[i+1] ? orbitData[i+1][1] : null);
				orbitData[i][2] = p.endGeometry();
			}
		}

		// checks to see if last path is already created, we do not need a boolean value for this
		if (!orbitData[4][3]) {
			for (let i = 0; i < orbitData.length; i++) {
				p.beginGeometry();
				buildPath(dataObject.bonusArr, c.arrayProbeStart, orbitData[i][1], orbitData[i+1] ? orbitData[i+1][1] : null);
				orbitData[i][3] = p.endGeometry();
			}
		}

		// set the main and secontary path to be drawn based on which one is being tracked
		let mainPath = s.trackBonus ? 3 : 2;
		let secondaryPath = !s.trackBonus ? 3 : 2;

		// show the secondary path first and only if showing other path enabled
		if (showOtherPath) {
			p.stroke(255,0,255);			// draw all paths the same color
			for (var i = 0; i < orbitData.length; i++)
				p.model(orbitData[i][secondaryPath]);
		}

		// draw all sections of the main path with respective colors
		for (var i = 0; i < orbitData.length; i++) {
			p.stroke(orbitData[i][0]);
			p.model(orbitData[i][mainPath]);
		}
	}

	function handleEarth(baseData, bonusData) {
		// set x y and z for later
		let x = bonusData[c.arrayEarthStart];
		let y = bonusData[c.arrayEarthStart+1];
		let z = bonusData[c.arrayEarthStart+2];

		if (followEarth)				// check if following the earth then go to its position
			goToPosition(x, y, z);

		p.stroke(0, 0, 255);

		p.push();

		p.translate(x, y, z);
		p.rotateX(-Math.PI);				// weird axes correction
		p.rotateX(-c.earthTilt);			// tilt axis
		p.rotateY(c.earthRotation * (s.time + 521) /* temporary fix to correct the earths initial rotation */);	// rotate earth

		p.push();

		p.rotateY(-Math.PI/2);				// weird axes correction that only applies to textures

		if (useTextures) {
			p.noStroke();				// disable stroke cuz its ugly
			p.shader(earthShader);			// activate shader then set all uniforms
			earthShader.setUniform("dayTexture", earthDayTex);
			earthShader.setUniform("nightTexture", earthNightTex);
			earthShader.setUniform("cloudTexture", cloudsTex);
			earthShader.setUniform("time", s.time);
			earthShader.setUniform("lightDirection", p.createVector(1, 0, 0).array());
			p.fill(255);				// this can be any color it just needs to be filled so that it renders
			p.sphere(c.earthRadius, 64, 64);
		} else
			p.sphere(c.earthRadius, 16, 8);		// lower poly because it looks better as a wire frame

		p.pop();

		// loop through antennas
		for (const pos of c.antennaPositions) {
			p.push();

			let r = c.earthRadius + pos[2];
			p.translate(r * Math.cos(pos[0]) * Math.cos(pos[1]), -r * Math.sin(pos[0]), -r * Math.cos(pos[0]) * Math.sin(pos[1]));	// negatives for even more weird axes correction

			let budget;
			if (s.trackBonus) {
				let probeData = s.trackBonus ? bonusData : baseData;
				let probeCoords = [probeData[c.arrayProbeStart], probeData[c.arrayProbeStart+1], probeData[c.arrayProbeStart+2]];
				let moonCoords = [bonusData[c.arrayMoonStart], bonusData[c.arrayMoonStart+1], bonusData[c.arrayMoonStart+2]];

				budget = dataObject.linkBudget(b.bonusRange(c.antennaPositions.indexOf(pos), probeCoords, moonCoords, s.time), pos[3]);
			} else
				budget = dataObject.linkBudget(baseData[pos[4]], pos[3]);

			let color = showAntennaColor ? antennaColor(budget) : [255, 0, 255];	// if show color is checked, color based on budget, else is magenta.
			p.stroke(color);			// color code specificly for its signal strength
			p.sphere(350, 4, 2);			// very low poly sphere on purpose

			p.pop();
		}

		p.pop();
	}

	function handleMoon(data) {
		let x = data[c.arrayMoonStart];
		let y = data[c.arrayMoonStart+1];
		let z = data[c.arrayMoonStart+2];

		if (followMoon)					// check if following the moon then go to its position
			goToPosition(x, y, z);

		p.stroke(255);

		p.push();

		p.translate(x, y, z);

		if (useTextures) {
			p.noStroke();
			p.shader(moonShader);			// activate shader then set all uniforms
			moonShader.setUniform("moonTexture", moonTex);
			moonShader.setUniform("lightDirection", p.createVector(1, 0, 0).array());
			p.fill(255);
			p.sphere(c.moonRadius, 64, 64);
		} else
			p.sphere(c.moonRadius, 12, 6);		// lower poly because it looks better as a wire frame

		p.pop();

		if (!moonPath) {				// check if the mon path has been created if not, generate
			p.beginGeometry();
			buildPath(dataObject.bonusArr, c.arrayMoonStart);
			moonPath = p.endGeometry();
		}

		// if so, render
		p.stroke(255,255,0);
		p.model(moonPath);
	}

	// draw an axie thing
	function drawAxie(x, y, z) {
		p.stroke(x*255,y*255,z*255);
		p.line(0,0,0,x*7500,y*7500,z*7500);
		p.push();
		p.translate(x*7500, y*7500, z*7500);
		p.sphere(500, 8, 4);
		p.pop();
	}

	// draw multiple axie things
	function handleAxes() {
		if (!showAxes)					// check if user wants to see this
			return;

		drawAxie(1,0,0);
		drawAxie(0,1,0);
		drawAxie(0,0,1);
	}

	function setSize() {
		let box = canvasdiv.getBoundingClientRect();	// find the current bounding box

		// quit if pointless
		if (box.width === prevbox.width && box.height === prevbox.height)
			return;

		p.resizeCanvas(box.width, box.height);		// resize the dom element
		p.perspective(2 * Math.atan(p.height / 2 / 800), p.width/p.height, 1, 10000000);	// recalculate the perspective box

		prevbox = box;					// update the previous box
	}

	// generates a formated string used in a log of the print statements
	function textTriplet(data, start) {
		return `${data[start].toFixed(3)}, ${data[start+1].toFixed(3)}, ${data[start+2].toFixed(3)}`;
	}

	// generates a formated string used in the link budget monitors
	function antennaText(budget) {
		if (isNaN(budget))
			return "N/A";

		if (budget > 10000)
			return `${budget.toFixed(2)}kb/s → 10Mb/s`;

		return `${budget.toFixed(2)}kb/s`;
	}

	function listText(num) {
		if (num == 10000)
			return "10Mb/s";
		if (isNaN(num))
			return "N/A";
		return `${num.toFixed(2)}kb/s`;
	}

	// Does the whole priorotized list thing
	function antennaList(wpsa, dss24, dss34, dss54) {
		let budgets = {
			'WPSA':  Math.min(wpsa, 10000),		// Makes the budgets a max of 10,000
			'DSS24': Math.min(dss24, 10000),
			'DSS34': Math.min(dss34, 10000),
			'DSS54': Math.min(dss54, 10000)
		};
	
		budgets[prevBest] += 0.0009765625;		// Adds a negligible amount to the previous one so it sorts slightly above (idc if this is the best way to do this but, once again, cry about it)
		const entries = Object.entries(budgets);
		entries.sort((a, b) => (isNaN(a[1]) ? 0 : a[1]) - (isNaN(b[1]) ? 0 : b[1])); 	// Sorts it, if the budget is NaN, it is 0 cuz the sorting doesn't work on NaN
		const sortedScores = Object.fromEntries(entries);
		sortedScores[prevBest] -= 0.0009765625;		// put back the value taken to make it accurate
		prevBest = Object.keys(sortedScores)[3];	// Makes prevbest

		return sortedScores;
	}

	function handleText(baseData, bonusData) {
		if (!showText)					// check if user wants to see this
			return;

		let probeData = s.trackBonus ? bonusData : baseData;

		// make generale stuff
		let framerate = p.frameRate();
		let probeV = Math.hypot(probeData[c.arrayProbeStart+3], probeData[c.arrayProbeStart+4], probeData[c.arrayProbeStart+5]);
		let moonV = Math.hypot(bonusData[c.arrayMoonStart+3], bonusData[c.arrayMoonStart+4], bonusData[c.arrayMoonStart+5]);

		let bufferLeft = `FPS: ${framerate.toFixed(3)}<br><br>`;
		let bufferRight = `Time: ${s.time.toFixed(3)}<br><br>`;

		// print all of the positions and velocities
		// Probe stuff
		bufferLeft += `───Probe Position───<br>`;
		bufferLeft += `X: ${probeData[c.arrayProbeStart].toFixed(2)}<br>`;
		bufferLeft += `Y: ${probeData[c.arrayProbeStart+1].toFixed(2)}<br>`;
		bufferLeft += `Z: ${probeData[c.arrayProbeStart+2].toFixed(2)}<br>`;
		bufferLeft += `───Probe Velocity───<br>`;
		bufferLeft += `X: ${probeData[c.arrayProbeStart+3].toFixed(3)}<br>`;
		bufferLeft += `Y: ${probeData[c.arrayProbeStart+4].toFixed(3)}<br>`;
		bufferLeft += `Z: ${probeData[c.arrayProbeStart+5].toFixed(3)}<br>`;
		bufferLeft += `Total: ${probeV.toFixed(3)}<br><br>`;

		// Moon stuff
		bufferLeft += `───Moon Position───<br>`;
		bufferLeft += `X: ${bonusData[c.arrayMoonStart].toFixed(2)}<br>`;
		bufferLeft += `Y: ${bonusData[c.arrayMoonStart+1].toFixed(2)}<br>`;
		bufferLeft += `Z: ${bonusData[c.arrayMoonStart+2].toFixed(2)}<br>`;
		bufferLeft += `───Moon Velocity───<br>`;
		bufferLeft += `X: ${bonusData[c.arrayMoonStart+3].toFixed(3)}<br>`;
		bufferLeft += `Y: ${bonusData[c.arrayMoonStart+4].toFixed(3)}<br>`;
		bufferLeft += `Z: ${bonusData[c.arrayMoonStart+5].toFixed(3)}<br>`;
		bufferLeft += `Total: ${moonV.toFixed(3)}<br>`;

		// DONE WITH LEFT SIDE ON TO THE RIGHT
		let dss24Link, dss34Link, dss54Link, wpsaLink;

		if (s.trackBonus) {
			let probeCoords = [probeData[c.arrayProbeStart], probeData[c.arrayProbeStart+1], probeData[c.arrayProbeStart+2]];
			let moonCoords = [bonusData[c.arrayMoonStart], bonusData[c.arrayMoonStart+1], bonusData[c.arrayMoonStart+2]];

			dss24Link = dataObject.linkBudget(b.bonusRange(0, probeCoords, moonCoords, s.time), 34);
			dss34Link = dataObject.linkBudget(b.bonusRange(1, probeCoords, moonCoords, s.time), 34);
			dss54Link = dataObject.linkBudget(b.bonusRange(2, probeCoords, moonCoords, s.time), 34);
			wpsaLink = dataObject.linkBudget(b.bonusRange(3, probeCoords, moonCoords, s.time), 12);
		} else {
			dss24Link = dataObject.linkBudget(probeData[c.arrayRangeDSS24], 34);
			dss34Link = dataObject.linkBudget(probeData[c.arrayRangeDSS34], 34);
			dss54Link = dataObject.linkBudget(probeData[c.arrayRangeDSS54], 34);
			wpsaLink = dataObject.linkBudget(probeData[c.arrayRangeWPSA], 34);
		}

		bufferRight += `─────${s.trackBonus ? "BONUS" : "BASE"} DATA─────<br>`;
		bufferRight += `Mass: ${probeData[c.arrayProbeStart+6].toFixed(2)}kg<br>`;
		bufferRight += `Dist: ${probeData[probeData.length-1].toFixed(2)}km<br><br>`;
		bufferRight += `───Antennas───<br>`;
		bufferRight += `DSS24: ${antennaText(dss24Link, 34)}<br>`;
		bufferRight += `DSS34: ${antennaText(dss34Link, 34)}<br>`;
		bufferRight += `DSS54: ${antennaText(dss54Link, 34)}<br>`;
		bufferRight += `WPSA: ${antennaText(wpsaLink, 12)}<br><br>`;

		// More stuff for the priorotized list
		let list = antennaList(wpsaLink, dss24Link, dss34Link, dss54Link);
		let antennaKeys = Object.keys(list);
		let antennaValues = Object.values(list);
		antennaValues = antennaValues.map(value => isNaN(value) ?  "Disc." : value);

		// Adds the priorotized list stuff
		bufferRight += `───Priority List───<br>`;

		// Total number of avaliable antennas (Because of strattons weird data roudning thing, Math.floor is necessary)
		bufferRight += `Avaliable: ${(isNaN(dss24Link) ? 0 : 1) + (isNaN(dss34Link) ? 0 : 1) + (isNaN(dss54Link) ? 0 : 1) + (isNaN(wpsaLink) ? 0 : 1)}<br>`
		bufferRight += `1: ${antennaKeys[3]} → ${listText(antennaValues[3])}<br>`;
		bufferRight += `2: ${antennaKeys[2]} → ${listText(antennaValues[2])}<br>`;
		bufferRight += `3: ${antennaKeys[1]} → ${listText(antennaValues[1])}<br>`;
		bufferRight += `4: ${antennaKeys[0]} → ${listText(antennaValues[0])}<br>`;

		overlayRightDOM.innerHTML = bufferRight;			// set the innerhtml to the newly generated buffer (this proved to be faster than writing to the DOM every time)
		overlayLeftDOM.innerHTML = bufferLeft;
	}

	p.preload = () => {
		//window.MSStream was removed because IE probably cant handle 8k textures lol (if you use IE, please get some help 🙏) both android and ios cant handle it in different ways
		let res = /CrOS|iPad|iPhone|iPod|Android/.test(navigator.userAgent) ? "4k" : "8k";
		help.classList.toggle("hidden", /iPad|iPhone|iPod|Android/.test(navigator.userAgent));

		// load the textures based on what resolution was chosen
		earthDayTex = p.loadImage('assets/' + res + '/earthDay.jpg');
		earthNightTex = p.loadImage('assets/' + res + '/earthNight.jpg');
		cloudsTex = p.loadImage('assets/' + res + '/clouds.jpg');
		moonTex = p.loadImage('assets/' + res + '/moon.jpg');

		// load the shaders
		earthShader = p.loadShader('src/glsl/earth.vert', 'src/glsl/earth.frag');
		moonShader = p.loadShader('src/glsl/moon.vert', 'src/glsl/moon.frag');

		rocketModel = p.loadModel('assets/orion.obj', true);
	}

	p.setup = () => {
		prevbox = canvasdiv.getBoundingClientRect();	// set the bounding box for the first time

		p.createCanvas(prevbox.width, prevbox.height, p.WEBGL, canvas);	// create the canvas using the box
		camera = p.createCamera();			// create the camera
		camera.camera(c.earthRadius * 3, c.earthRadius * 2, -c.earthRadius * 3, 0, 0, 0, 0, -1, 0);	// 0, -1, 0 to make coordinate system right handed

		p.perspective(2 * Math.atan(prevbox.height / 2 / 800), prevbox.width/prevbox.height, 1, 10000000);	// initialize the camera

		p.background(0);				// clear background as quick as posible
		p.noFill();					// default to nofill
		p.strokeWeight(100);				// default strokeweight

		document.getElementById("loading").style.display = "none";	// remove the loading animation
	}

	p.draw = () => {
		setSize();					// check if size has changed and adjust if it has

		if (!(dataObject.baseReady && dataObject.bonusReady))	// stall until the data has been loaded (kinda hacky solution)
			return;

		if (!s.isDragging)				// make sure the minimap isnt being dragged because p5 is too stupid to take input by dom element
			p.orbitControl(2, 2, 0.5);		// default orbit controls are wack
		p.background(0);

		// set the current data points based on time
		let baseData = dataObject.dataWeightedAverage(dataObject.baseArr, s.time);
		let bonusData = dataObject.dataWeightedAverage(dataObject.bonusArr, s.time);

		// run each handler
		handleEarth(baseData, bonusData);
		handleMoon(bonusData);
		handleRocket(baseData, bonusData);
		handleText(baseData, bonusData);
		handleAxes();

		if (playing)					// increment time if playing
			setTime(s.time + speed * p.deltaTime / 1000);
	}

	p.keyPressed = () => {
		if (p.keyCode == 27) {				// on esc key press show/hide menu
			menu.classList.toggle("hidden");
			canvasdiv.classList.toggle("small");
			help.classList.add("hidehelp");
		}
	}

	// disable all except selected and update values (ik its just radio buttons)
	followEarthDOM.oninput = followMoonDOM.oninput = followProbeDOM.oninput = e => {
		if (e.target.id != "followearth")
			followEarthDOM.checked = false;
		if (e.target.id != "followmoon")
			followMoonDOM.checked = false;
		if (e.target.id != "followprobe")
			followProbeDOM.checked = false;

		followEarth = followEarthDOM.checked;
		followMoon = followMoonDOM.checked;
		followProbe = followProbeDOM.checked;
	}

	// parse the time and both dom elements to match it
	function setTime(input) {
		if (realTime) {
			let now = new Date();
			let timeDifference = now.getTime() - c.launchTime.getTime();
			input = timeDifference / (1000 * 60);
			input = Math.max(input, 0);		// If it's negative, turns it into positive
		}

		s.time = parseFloat(input);

		if (input == "" || isNaN(s.time))		// default to 0 if bad input
			s.time = 0;

		timeDOM.value = input;				// set it to original in case of mis-input
		timeSliderDOM.value = s.time;			// needs to be valid
	}

	playButtonDOM.onclick = e => { playing = e.target.classList.toggle('playing'); };

	timeDOM.oninput = timeSliderDOM.oninput = e => { setTime(e.target.value); };

	speedDOM.oninput = e => {
		speed = e.target.value == '' ? 10 : parseFloat(e.target.value);
	};

	strokeDOM.oninput = e => {
		strokeWeight = e.target.value == '' ? 100 : parseFloat(e.target.value);
		p.strokeWeight(strokeWeight);
	};

	const textCheckboxDOM = document.getElementById("textcheckbox");
	textCheckboxDOM.oninput = () => {
		showText = textCheckboxDOM.checked;

		overlayLeftDOM.innerHTML = '';
		overlayRightDOM.innerHTML = '';
		overlayLeftDOM.classList.toggle("hidden", !showText);
		overlayRightDOM.classList.toggle("hidden", !showText);
	};

	const texturesCheckboxDOM = document.getElementById("texturescheckbox");
	texturesCheckboxDOM.oninput = () => { useTextures = texturesCheckboxDOM.checked; };

	const axesCheckboxDOM = document.getElementById("axescheckbox");
	axesCheckboxDOM.oninput = () => { showAxes = axesCheckboxDOM.checked; };

	const realCheckboxDOM = document.getElementById("realcheckbox");
	realCheckboxDOM.oninput = () => { realTime = realCheckboxDOM.checked; }

	const bonusCheckboxDOM = document.getElementById("bonuscheckbox");
	bonusCheckboxDOM.oninput = () => { s.trackBonus = bonusCheckboxDOM.checked; };

	const otherCheckboxDOM = document.getElementById("othercheckbox");
	otherCheckboxDOM.oninput = () => { showOtherPath = otherCheckboxDOM.checked; }

	const antennaCheckboxDOM = document.getElementById("antennacheckbox");
	antennaCheckboxDOM.oninput = () => { showAntennaColor = antennaCheckboxDOM.checked; };

	const rocketModelCheckboxDOM = document.getElementById("rocketmodelcheckbox");
	rocketModelCheckboxDOM.oninput = () => { useRocketModel = rocketModelCheckboxDOM.checked };
}
