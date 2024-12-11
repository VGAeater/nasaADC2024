import * as c from "./constants.js";
import * as b from "./bonus.js";


export const scene = (dataObject, s) => (p) => {
	// [color, start, end, base model, bonus model]
	var orbitData = [
		[[227, 139, 73], 0, null, null],		//EDL part 1
		[[241, 64, 42], 115, null, null],		//orbiting earth
		[[40, 169, 221], 1497, null, null],		// to the moon
		[[255, 255, 255], 7093, null, null],		//back to earth
		[[227, 139, 73], 12960, null, null]		//EDL part 2
	];

	var moonPath;						// moon path model that will be built later

	var stars = [];						// star background

	var realTime = false;

	var prevBest = "WPSA";		// Previous best for the priorotized list

	var showAxes = false, showAntennaColor = true, useTextures = true, useRocketModel = true;	// state tracking variables for graphical options
	var followEarth = false, followMoon = false, followProbe = false;	// state tracking variables for following
	var playing = false, speed = 10, strokeWeight = 100;	// state tracking variables for simulation speed

	// input dom objects
	const followEarthDOM = document.getElementById("followearth");
	const followMoonDOM = document.getElementById("followmoon");
	const followProbeDOM = document.getElementById("followprobe");

	const timeDOM = document.getElementById("time");
	const timeValueDOM = document.getElementById("timeValue");
	const strokeDOM = document.getElementById("stroke");
	const speedDOM = document.getElementById("speed");
	const timeSliderDOM = document.getElementById("timeslider");

	const playButtonDOM = document.getElementById("playbutton");

	const fpsDOM = document.getElementById("fpsValue");

	// Probe Pos
	const probePosXDOM = document.getElementById("probePosX");
	const probePosYDOM = document.getElementById("probePosY");
	const probePosZDOM = document.getElementById("probePosZ");

	// Probe Vel
	const probeVelXDOM = document.getElementById("probeVelX");
	const probeVelYDOM = document.getElementById("probeVelY");
	const probeVelZDOM = document.getElementById("probeVelZ");
	const probeVelTotalDOM = document.getElementById("probeVelTotal");

	// Moon Pos
	const moonPosXDOM = document.getElementById("moonPosX");
	const moonPosYDOM = document.getElementById("moonPosY");
	const moonPosZDOM = document.getElementById("moonPosZ");

	// Moon Vel
	const moonVelXDOM = document.getElementById("moonVelX");
	const moonVelYDOM = document.getElementById("moonVelY");
	const moonVelZDOM = document.getElementById("moonVelZ");
	const moonVelTotalDOM = document.getElementById("moonVelTotal");

	// Visual Elements
	const showAxesDOM = document.getElementById("axescheckbox");
	const useTexturesDOM = document.getElementById("texturescheckbox");
	const realTimeDOM = document.getElementById("realcheckbox");
	const minimapDOM = document.getElementById("minimapcheckbox");
	const showRocketModelDOM = document.getElementById("rocketmodelcheckbox");

	// Antenna Status
	const dss24StatusDOM = document.getElementById("dss24Status");
	const dss34StatusDOM = document.getElementById("dss34Status");
	const dss54StatusDOM = document.getElementById("dss54Status");
	const wpsaStatusDOM = document.getElementById("wpsaStatus");

	// Antenna Priority
	const priorityValue1DOM = document.getElementById("priorityValue1");
	const priorityValue2DOM = document.getElementById("priorityValue2");
	const priorityValue3DOM = document.getElementById("priorityValue3");
	const priorityValue4DOM = document.getElementById("priorityValue4");

	const priorityLabel1DOM = document.getElementById("priorityLabel1");
	const priorityLabel2DOM = document.getElementById("priorityLabel2");
	const priorityLabel3DOM = document.getElementById("priorityLabel3");
	const priorityLabel4DOM = document.getElementById("priorityLabel4");

	var showOtherPath = false;				// data selection trackers
	var earthDayTex, earthNightTex, moonTex, cloudsTex, starsBG;	// the textures for the earth and moon
	var earthShader, moonShader;		// the shaders for the eath, moon, and atmosphere
	var rocketModel;

	// main dom objects
	const canvas = document.getElementById("canvas");
	const canvasdiv = document.getElementById("canvasdiv");
	const menu = document.getElementById("menuContainer");

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
	function buildPath(arr, selector, start = 0, end = null) {
		if (end == null)
			end = arr[0].length - 1;
		for (let i = start; i < end; i++)
			p.line(arr[selector][i], arr[selector + 1][i], arr[selector + 2][i], arr[selector][i + 1], arr[selector + 1][i + 1], arr[selector + 2][i + 1]);
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

	function createStarBackground(starNums = 1000) {
		var stars = [];
		var starColors = [[200, 200, 200], [175, 175, 175], [150, 150, 150], [100, 100, 100], [50, 50, 50]];

		function makeRandomStarPoint() {
			const r = Math.floor(Math.random() * 600000) + 400000;
			const randAngle = Math.random();

			const theta = 2 * Math.PI * randAngle;
			const phi = Math.random() * Math.PI;

			//gets cartesian coordinates
			const x = r * Math.sin(phi) * Math.cos(theta);
			const y = r * Math.sin(phi) * Math.sin(theta);
			const z = r * Math.cos(phi);
			
			return {
				x: x,
				y: y,
				z: z,
				color: starColors[Math.floor(Math.random() * starColors.length)],
				strokeWeight: Math.floor(Math.random() * 5) + 2
			};
		}

		for (let i = 0; i < starNums; i++) {
			stars.push(makeRandomStarPoint());
		}
		
		return stars;
	}

	function handleRocket(baseData, bonusData) {
		let data = s.trackBonus ? bonusData : baseData;	// switch to bonus data if tracking it

		// set the x y z xv yv and zv for later
		let x = data[c.arrayProbeStart];
		let y = data[c.arrayProbeStart + 1];
		let z = data[c.arrayProbeStart + 2];

		let xv = data[c.arrayProbeStart + 3];
		let yv = data[c.arrayProbeStart + 4];
		let zv = data[c.arrayProbeStart + 5];

		if (followProbe)				// check if following the probe then go to its position
			goToPosition(x, y, z);

		p.stroke(0, 255, 255);

		p.push();

		p.translate(x, y, z);

		if (useRocketModel) {
			p.strokeWeight(1);			// wow wireframe!! 
			p.scale(4);				// looks miscroscopic without scaling up
			p.model(rocketModel);
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
				buildPath(dataObject.baseArr, c.arrayProbeStart, orbitData[i][1], orbitData[i + 1] ? orbitData[i + 1][1] : null);
				orbitData[i][2] = p.endGeometry();
			}
		}

		// checks to see if last path is already created, we do not need a boolean value for this
		if (!orbitData[4][3]) {
			for (let i = 0; i < orbitData.length; i++) {
				p.beginGeometry();
				buildPath(dataObject.bonusArr, c.arrayProbeStart, orbitData[i][1], orbitData[i + 1] ? orbitData[i + 1][1] : null);
				orbitData[i][3] = p.endGeometry();
			}
		}

		// set the main and secontary path to be drawn based on which one is being tracked
		let mainPath = s.trackBonus ? 3 : 2;
		let secondaryPath = !s.trackBonus ? 3 : 2;

		// show the secondary path first and only if showing other path enabled
		if (showOtherPath) {
			p.stroke(255, 0, 255);			// draw all paths the same color
			for (var i = 0; i < orbitData.length; i++)
				p.model(orbitData[i][secondaryPath]);
		}

		// draw all sections of the main path with respective colors
		for (var i = 0; i < orbitData.length; i++) {
			p.stroke(orbitData[i][0]);
			p.model(orbitData[i][mainPath]);
		}
	}

	function handleEarth(baseData, bonusData, budgets) {
		// set x y and z for later
		let x = bonusData[c.arrayEarthStart];
		let y = bonusData[c.arrayEarthStart + 1];
		let z = bonusData[c.arrayEarthStart + 2];

		if (followEarth)				// check if following the earth then go to its position
			goToPosition(x, y, z);

		p.stroke(0, 0, 255);

		p.push();

		p.translate(x, y, z);
		p.rotateX(-Math.PI);				// weird axes correction
		p.rotateX(-c.earthTilt);			// tilt axis
		p.rotateY(c.earthRotation * (s.time + 521) /* temporary fix to correct the earths initial rotation */);	// rotate earth

		p.push();

		p.rotateY(-Math.PI / 2);				// weird axes correction that only applies to textures

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
		for (let i = 0; i < c.antennaPositions.length; i++) {
			let ant = c.antennaPositions[i];
			p.push();

			let r = c.earthRadius + ant[2];
			p.translate(r * Math.cos(ant[0]) * Math.cos(ant[1]), -r * Math.sin(ant[0]), -r * Math.cos(ant[0]) * Math.sin(ant[1]));	// negatives for even more weird axes correction

			let color = showAntennaColor ? antennaColor(budgets[i]) : [255, 0, 255];	// if show color is checked, color based on budget, else is magenta.
			p.stroke(color);			// color code specificly for its signal strength
			p.sphere(350, 4, 2);			// very low poly sphere on purpose

			p.pop();
		}

		p.pop();
	}

	function handleMoon(data) {
		let x = data[c.arrayMoonStart];
		let y = data[c.arrayMoonStart + 1];
		let z = data[c.arrayMoonStart + 2];

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
		p.stroke(255, 255, 0);
		p.model(moonPath);
	}

	// draw an axie thing
	function drawAxie(x, y, z) {
		p.stroke(x * 255, y * 255, z * 255);
		p.line(0, 0, 0, x * 7500, y * 7500, z * 7500);
		p.push();
		p.translate(x * 7500, y * 7500, z * 7500);
		p.sphere(500, 8, 4);
		p.pop();
	}

	// draw multiple axie things
	function handleAxes() {
		if (!showAxes)					// check if user wants to see this
			return;

		drawAxie(1, 0, 0);
		drawAxie(0, 1, 0);
		drawAxie(0, 0, 1);
	}

	// generates a formated string used in a log of the print statements
	function textTriplet(data, start) {
		return `${data[start].toFixed(3)}, ${data[start + 1].toFixed(3)}, ${data[start + 2].toFixed(3)}`;
	}

	// generates a formated string used in the link budget monitors
	function antennaText(budget) {
		if (isNaN(budget))
			return "Inactive";

		if (budget > 10000)
			return `${budget.toFixed(2)}kb/s → 10Mb/s`;

		return `${budget.toFixed(2)}kb/s`;
	}

	function listText(num) {
		if (num == 10000)
			return "10Mb/s";
		if (isNaN(num))
			return "Inactive";
		return `${num.toFixed(2)}kb/s`;
	}

	// Does the whole priorotized list thing
	function antennaList(dss24, dss34, dss54, wpsa) {
		let budgets = {
			'WPSA': Math.min(wpsa, 10000),		// Makes the budgets a max of 10,000
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

	function avaliableAntennaColors(amount) {
		if (amount == 3)
			return "#00ff00";
		else if (amount == 2)
			return "#ffd300";
		else if (amount == 1)
			return "#ff8800";
		return "#ff0000";
	}

	function handleText(baseData, bonusData, budgets) {
		let probeData = s.trackBonus ? bonusData : baseData;
	
		// make general stuff
		let framerate = p.frameRate();
		let probeV = Math.hypot(probeData[c.arrayProbeStart + 3], probeData[c.arrayProbeStart + 4], probeData[c.arrayProbeStart + 5]);
		let moonV = Math.hypot(bonusData[c.arrayMoonStart + 3], bonusData[c.arrayMoonStart + 4], bonusData[c.arrayMoonStart + 5]);
	
		// Update fpsDOM with the FPS value
		fpsDOM.innerText = framerate.toFixed(3);

		document.getElementById("timeValue").innerText = s.time.toFixed(3);
	
		probePosXDOM.innerText = probeData[c.arrayProbeStart].toFixed(2);
		probePosYDOM.innerText = probeData[c.arrayProbeStart + 1].toFixed(2);
		probePosZDOM.innerText = probeData[c.arrayProbeStart + 2].toFixed(2);
	
		probeVelXDOM.innerText = probeData[c.arrayProbeStart + 3].toFixed(3);
		probeVelYDOM.innerText = probeData[c.arrayProbeStart + 4].toFixed(3);
		probeVelZDOM.innerText = probeData[c.arrayProbeStart + 5].toFixed(3);
		probeVelTotalDOM.innerText = probeV.toFixed(3);

		moonPosXDOM.innerText = bonusData[c.arrayMoonStart].toFixed(2);
		moonPosYDOM.innerText = bonusData[c.arrayMoonStart + 1].toFixed(2);
		moonPosZDOM.innerText = bonusData[c.arrayMoonStart + 2].toFixed(2);
	
		moonVelXDOM.innerText = bonusData[c.arrayMoonStart + 3].toFixed(3);
		moonVelYDOM.innerText = bonusData[c.arrayMoonStart + 4].toFixed(3);
		moonVelZDOM.innerText = bonusData[c.arrayMoonStart + 5].toFixed(3);
		moonVelTotalDOM.innerText = moonV.toFixed(3);
	
		let [dss24Link, dss34Link, dss54Link, wpsaLink] = budgets;
	
		dss24StatusDOM.innerText = antennaText(dss24Link);
		dss34StatusDOM.innerText = antennaText(dss34Link);
		dss54StatusDOM.innerText = antennaText(dss54Link);
		wpsaStatusDOM.innerText = antennaText(wpsaLink);
	
		let list = antennaList(dss24Link, dss34Link, dss54Link, wpsaLink);
		let antennaKeys = Object.keys(list);
		let antennaValues = Object.values(list);
		antennaValues = antennaValues.map(value => isNaN(value) ? "Disc." : value);

		priorityLabel1DOM.innerText = antennaKeys[3];
		priorityLabel2DOM.innerText = antennaKeys[2];
		priorityLabel3DOM.innerText = antennaKeys[1];
		priorityLabel4DOM.innerText = antennaKeys[0];

		priorityValue1DOM.innerText = listText(antennaValues[3]);
		priorityValue2DOM.innerText = listText(antennaValues[2]);
		priorityValue3DOM.innerText = listText(antennaValues[1]);
		priorityValue4DOM.innerText = listText(antennaValues[0]);

		let avaliableAntennas = (isNaN(dss24Link) ? 0 : 1) + (isNaN(dss34Link) ? 0 : 1) + (isNaN(dss54Link) ? 0 : 1) + (isNaN(wpsaLink) ? 0 : 1);
		const totalAvailableDOM = document.getElementById("totalAvailable");
    	totalAvailableDOM.innerText = `${avaliableAntennas} Antenna${avaliableAntennas !== 1 ? 's' : ''}`;
    	totalAvailableDOM.style.color = avaliableAntennaColors(avaliableAntennas);
	}

	function setSize() {
		let box = canvasdiv.getBoundingClientRect();	// find the current bounding box

		// quit if pointless
		if (box.width === prevbox.width && box.height === prevbox.height)
			return;

		p.resizeCanvas(box.width, box.height);		// resize the dom element
		p.perspective(2 * Math.atan(p.height / 2 / 800), p.width / p.height, 1, 10000000);	// recalculate the perspective box

		prevbox = box;					// update the previous box
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

		p.perspective(2 * Math.atan(p.height / 2 / 800), p.width / p.height, 1, 10000000);	// initialize the camera


		p.background(0);				// clear background as quick as posible
		p.noFill();					// default to nofill
		p.strokeWeight(100);				// default strokeweight

		document.getElementById("loading").style.display = "none";	// remove the loading animation
	}

	p.draw = () => {
		setSize();					// check if size has changed and adjust if it has
		p.background(0);
		if (!(dataObject.baseReady && dataObject.bonusReady))	// stall until the data has been loaded (kinda hacky solution)
			return;

		if (!s.isDragging)				// make sure the minimap isnt being dragged because p5 is too stupid to take input by dom element
			p.orbitControl(2, 2, 0.5);		// default orbit controls are wack

		// set the current data points based on time
		let baseData = dataObject.dataWeightedAverage(dataObject.baseArr, s.time);
		let bonusData = dataObject.dataWeightedAverage(dataObject.bonusArr, s.time);

		let budgets = [];
		for (let i = 0; i < 4; i++) {
			let ant = c.antennaPositions[i];
			if (!s.trackBonus) {
				budgets.push(dataObject.linkBudget(baseData[ant[4]], ant[3]));
				continue;
			}

			let probeData = s.trackBonus ? bonusData : baseData;
			let probeCoords = [probeData[c.arrayProbeStart], probeData[c.arrayProbeStart + 1], probeData[c.arrayProbeStart + 2]];
			let moonCoords = [bonusData[c.arrayMoonStart], bonusData[c.arrayMoonStart + 1], bonusData[c.arrayMoonStart + 2]];

			budgets.push(dataObject.linkBudget(b.bonusRange(i, probeCoords, moonCoords, s.time), ant[3]));
		}
		
		// run each handler
		handleEarth(baseData, bonusData, budgets);
		handleMoon(bonusData);
		handleRocket(baseData, bonusData);
		handleText(baseData, bonusData, budgets);
		handleAxes();


		if (playing)					// increment time if playing
			setTime(s.time + speed * p.deltaTime / 1000);
	}

	p.keyPressed = () => {
		if (p.keyCode == 27) {				// on esc key press show/hide menu
			menu.classList.toggle("hide");
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
			input = Math.max(input, 0);
		}
	
		s.time = parseFloat(input);
	
		if (input == "" || isNaN(s.time))
			s.time = 0;
	
		timeDOM.value = input;              // Update input field
		timeSliderDOM.value = s.time;       // Update slider
		timeValueDOM.innerText = s.time.toFixed(3); // Update display value
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