const tanMult = 5000;
const arrayEarthStart = 8, arrayMoonStart = 14, arrayProbeStart = 1;
const arrayProbeMass = 7;
const arrayRangeWPSA = 9, arrayRangeDSS54 = 11, arrayRangeDSS24 = 13, arrayRangeDSS34 = 15;
const earthRadius = 6378.137, moonRadius = 1737.4;
const earthTilt = 0.40910518, earthRotation = 0.0043752689390883629091912824047036316217347442667247770055869327107291376933374649965090290441628832370979032264616092647931526225026442232147712881989155271345349586303407442060355058319830324161455127;

// [ lat, long, relative alt, dish radius, starting position in data array ]
const antennaPositions = [
	[35.3399*Math.PI/180, -116.875*Math.PI/180, 0.951499, 34, arrayRangeDSS24],
	[-35.3985*Math.PI/180, 148.982*Math.PI/180, 0.69202, 34, arrayRangeDSS34],
	[40.4256*Math.PI/180, -4.2541*Math.PI/180, 0.837051, 34, arrayRangeDSS54],
	[37.9273*Math.PI/180, -75.475*Math.PI/180, -0.019736, 12, arrayRangeWPSA]
];

// [color, start, end, base model, bonus model]
var orbitData = [
	[[227, 139, 73], 0, null, null], //EDL part 1
	[[241, 64, 42], 115, null, null], //orbiting earth
	[[40, 169, 221], 1497, null, null], // to the moon
	[[255, 255, 255], 7093, null, null], //back to earth
	[[227, 139, 73], 12960, null, null] //EDL part 2
];

// moon path model that will be built later
var moonPath;
var time = 0;

var showAxes = false, showText = false, showAntennaColor = true, useTextures = true;	// state tracking variables for graphical options
var followEarth = false, followMoon = false, followProbe = false;	// state tracking variables for following
var playing = false, speed = 10;					// state tracking variables for simulation speed
var followEarthDOM, followMoonDOM, followProbeDOM;			// dom objects for follow switches
var timeDOM, strokeDOM, speedDOM;					// dom objects for text input
var timeSliderDOM;
var overlayDOM;

var trackBonus = false, showOtherPath = false;				// data selection trackers

var canvasdiv, menu;
var prevcanvasbox;							// stores what the previous bounding box of the canvas was

var earthDayTex, earthNightTex, moonTex, cloudsTex;			// the textures for the earth and moon
var earthShader, moonShader, atmoShader;				// the shaders for the eath, moon, and atmosphere
var pass1Shader;							// probably going to get deleted

// finds the length budget for a specific range and radius of dish
function linkBudget(slantr, dr) {
	pt = 10;
	gt = 9;
	losses = 19.43;
	nr = 0.55;
	lam = 0.136363636363636;
	kb = -228.6;
	ts = 22;
	first = pt + gt - losses;
	dishCirc = dr * Math.PI;
	second = 10 * Math.log10(nr * ((dishCirc / lam)**2));
	slant = 4000 * slantr * Math.PI;
	third = -20 * Math.log10(slant / lam);
	fourth = -kb - 10 * Math.log10(22);
	expo = (first + second + third + fourth) / 10;
	bits = 10**expo;
	return bits / 1000;
}

/*
 * special binary search algo that finds the lower of the indexes the
 * value is between:
 * x = 100;
 * [ 98, 101 ];
 * y = 0;
 */
function binarySearchFloor(arr, el) {
	let m = 0;
	let n = arr.length - 1;
	while (m <= n) {
		let k = (n + m) >> 1;
		let cmp = el - arr[k];
		if (cmp > 0) m = k + 1;
		else if (cmp < 0) n = k - 1;
		else return k;
	} 
	return m-1;
}

/*
 * calculate a value between the two closest elements interpolated
 * based on how close the time is to each of its niehbors
 * x = 100;
 * [ 98, 101 ];
 * 98 99 100 101
 *        ^
 *     weight
 */
function dataWeightedAverage(arr, time) {
	let timeIndex = binarySearchFloor(arr[0], time);

	let output = [];
	if (timeIndex+1 >= arr[0].length) {
		for (let i = 0; i < arr.length; i++)
			output.push(arr[i][arr[0].length - 1]);
		return output;
	}
		
	if (timeIndex < 0) {
		for (let i = 0; i < arr.length; i++)
			output.push(arr[i][0]);
		return output;
	}

	let lowerTime = arr[0][timeIndex];
	let upperTime = arr[0][timeIndex+1];

	let clampTimeDelta = upperTime - lowerTime;
	let realTimeDelta = time - lowerTime;

	let weight = realTimeDelta / clampTimeDelta;

	for (let i = 0; i < arr.length; i++)
		output.push(arr[i][timeIndex] * (1 - weight) + arr[i][timeIndex+1] * weight);

	return output;
}

// parse the input data file
function buildArr(text) {
	let data = text.split("\n");
	let key = data[0].split(",");
	let arr = [...Array(key.length)].map(e => []);

	for (let i = 1; i < data.length-1; i++) {
		let row = data[i].split(",");
		for (let j = 0; j < key.length; j++)
			arr[j].push(parseFloat(row[j]));
	}

	return [arr, key];
}

// read base file
var baseArr, baseKey;
var baseReady = false;
fetch('assets/updated.csv').then(response => {
	return response.text();
}).then(text => {
	[baseArr, baseKey] = buildArr(text);
	baseReady = true;
});

// read bonus file
var bonusArr, bonusKey;
var bonusReady = false;
fetch('assets/bonus.csv').then(response => {
	return response.text();
}).then(text => {
	[bonusArr, bonusKey] = buildArr(text);
	bonusReady = true;
});

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
		line(arr[selector][i], arr[selector+1][i], arr[selector+2][i], arr[selector][i+1], arr[selector+1][i+1], arr[selector+2][i+1]);
}

// return a color based on how strong the antenna's connection is
function antennaColor(budget) {
	if (isNaN(budget))
		return [255, 0, 0, 255 * (sin(millis() / 100) + 1) / 2];	// make strobing effect when no signal
	if (budget > 8000)
		return [0, 255, 0];
	if (budget > 4000)
		return [255, 211, 0];
	if (budget > 1000)
		return [255, 140, 0];
	return [255, 0, 0];				// default to red for very weak connections
}

function handleRocket(baseData, bonusData) {
	let data = trackBonus ? bonusData : baseData;	// switch to bonus data if tracking it

	// set the x y z xv yv and zv for later
	let x = data[arrayProbeStart];
	let y = data[arrayProbeStart+1];
	let z = data[arrayProbeStart+2];

	let xv = data[arrayProbeStart+3];
	let yv = data[arrayProbeStart+4];
	let zv = data[arrayProbeStart+5];

	if (followProbe)				// check if following the probe then go to its position
		goToPosition(x, y, z);

	stroke(0,255,255);

	push();

	translate(x, y, z);
	//rotateZ(createVector(x, y).heading());
	//rotateY(-createVector(x, y).heading());
	//console.log(createVector(x, y, z).angleBetween(createVector(0, 0, 0)));
	cone(500, 1000, 8);				// draw the probe

	pop();

	stroke(255,0,0);
	line(x, y, z, x + xv * tanMult, y + yv * tanMult, z + zv * tanMult);

	// checks to see if last path is already created, we do not need a boolean value for this
	if (!orbitData[4][2]) {
		for (let i = 0; i < orbitData.length; i++) {
			beginGeometry();
			buildPath(baseArr, arrayProbeStart, orbitData[i][1], orbitData[i+1] ? orbitData[i+1][1] : null);
			orbitData[i][2] = endGeometry();
		}
	}

	// checks to see if last path is already created, we do not need a boolean value for this
	if (!orbitData[4][3]) {
		for (let i = 0; i < orbitData.length; i++) {
			beginGeometry();
			buildPath(bonusArr, arrayProbeStart, orbitData[i][1], orbitData[i+1] ? orbitData[i+1][1] : null);
			orbitData[i][3] = endGeometry();
		}
	}

	// set the main and secontary path to be drawn based on which one is being tracked
	let mainPath = trackBonus ? 3 : 2;
	let secondaryPath = !trackBonus ? 3 : 2;

	// show the secondary path first and only if showing other path enabled
	if (showOtherPath) {
		stroke(255,0,255);			// draw all paths the same color
		for (var i = 0; i < orbitData.length; i++)
			model(orbitData[i][secondaryPath]);
	}

	// draw all sections of the main path with respective colors
	for (var i = 0; i < orbitData.length; i++) {
		stroke(orbitData[i][0]);
		model(orbitData[i][mainPath]);
	}
}

function handleEarth(baseData, bonusData) {
	// set x y and z for later
	let x = bonusData[arrayEarthStart];
	let y = bonusData[arrayEarthStart+1];
	let z = bonusData[arrayEarthStart+2];

	if (followEarth)				// check if following the earth then go to its position
		goToPosition(x, y, z);

	stroke(0, 0, 255);

	push();

	translate(x, y, z);
	rotateX(-PI);					// weird axes correction
	rotateX(-earthTilt);				// tilt axis
	rotateY(earthRotation * time + earthRotation * 521 /* temporary fix to correct the earths initial rotation */);	// rotate earth

	push();

	rotateY(-HALF_PI);				// weird axes correction that only applies to textures

	if (useTextures) {
		noStroke();				// disable stroke cuz its ugly
		shader(earthShader);			// activate shader then set all uniforms
		earthShader.setUniform("dayTexture", earthDayTex);
		earthShader.setUniform("nightTexture", earthNightTex);
		earthShader.setUniform("cloudTexture", cloudsTex);
		earthShader.setUniform("time", time);
		earthShader.setUniform("lightDirection", createVector(1, 0, 0).array());
		fill(255);				// this can be any color it just needs to be filled so that it renders
		sphere(earthRadius, 64, 64);
	} else
		sphere(earthRadius, 16, 8);		// lower poly because it looks better as a wire frame

	pop();

	// loop through antennas
	for (const pos of antennaPositions) {
		push();

		let r = earthRadius + pos[2];
		translate(r * cos(pos[0]) * cos(pos[1]), -r * sin(pos[0]), -r * cos(pos[0]) * sin(pos[1]));	// negatives for even more weird axes correction
		budget = linkBudget(baseData[pos[4]], pos[3]);
		color = showAntennaColor ? antennaColor(budget) : [255, 0, 255];	// if show color is checked, color based on budget, else is magenta.
		stroke(color);				// color code specificly for its signal strength
		sphere(350, 4, 2);			// very low poly sphere on purpose

		pop();
	}

	pop();
}

function handleMoon(data) {
	let x = data[arrayMoonStart];
	let y = data[arrayMoonStart+1];
	let z = data[arrayMoonStart+2];

	if (followMoon)					// check if following the moon then go to its position
		goToPosition(x, y, z);

	stroke(255);

	push();

	translate(x, y, z);

	if (useTextures) {
		noStroke();
		shader(moonShader);			// activate shader then set all uniforms
		moonShader.setUniform("moonTexture", moonTex);
		moonShader.setUniform("lightDirection", createVector(1, 0, 0).array());
		fill(255);
		sphere(moonRadius, 64, 64);
	} else
		sphere(moonRadius, 12, 6);		// lower poly because it looks better as a wire frame

	pop();

	if (!moonPath) {				// check if the mon path has been created if not, generate
		beginGeometry();
		buildPath(bonusArr, arrayMoonStart);
		moonPath = endGeometry();
	}

	// if so, render
	stroke(255,255,0);
	model(moonPath);
}

// draw an axie thing
function drawAxie(x, y, z) {
	stroke(x*255,y*255,z*255);
	line(0,0,0,x*7500,y*7500,z*7500);
	push();
	translate(x*7500, y*7500, z*7500);
	sphere(500, 8, 4);
	pop();
}

// draw multiple axie things
function handleAxes() {
	if (!showAxes)					// check if user wants to see this
		return;

	drawAxie(1,0,0);
	drawAxie(0,1,0);
	drawAxie(0,0,1);
}

// generates a formated string used in a log of the print statements
function textTriplet(data, start) {
	return `${data[start].toFixed(3)}, ${data[start+1].toFixed(3)}, ${data[start+2].toFixed(3)}`;
}

// generates a formated string used in the length budget monitors
function antennaText(range, radius) {
	let netBudget = linkBudget(range, radius);

	if (netBudget > 10000)
		return `${netBudget.toFixed(3)}kbps → 10000`;

	return netBudget.toFixed(3);
}

function handleText(baseData, bonusData) {
	if (!showText)					// check if user wants to see this
		return;

	let probeData = trackBonus ? bonusData : baseData;

	// make generale stuff
	let framerate = frameRate();
	let probeV = sqrt(probeData[arrayProbeStart+3]**2 + probeData[arrayProbeStart+4]**2 + probeData[arrayProbeStart+5]**2);
	let moonV = sqrt(bonusData[arrayMoonStart+3]**2 + bonusData[arrayMoonStart+4]**2 + bonusData[arrayMoonStart+5]**2);
	let earthV = sqrt(bonusData[arrayEarthStart+3]**2 + bonusData[arrayEarthStart+4]**2 + bonusData[arrayEarthStart+5]**2);

	let buffer = `FPS: ${framerate.toFixed(3)} Time: ${time.toFixed(3)}<br>`;

	// print all of the positions and velocities
	buffer += `Probe pos: ${textTriplet(probeData, arrayProbeStart)}<br>`;
	buffer += `Probe vel: ${textTriplet(probeData, arrayProbeStart+3)} → ${probeV.toFixed(3)}<br>`;
	buffer += `Moon pos: ${textTriplet(bonusData, arrayMoonStart)}<br>`;
	buffer += `Moon vel: ${textTriplet(bonusData, arrayMoonStart+3)} → ${moonV.toFixed(3)}<br>`;
	buffer += `Earth pos: ${textTriplet(bonusData, arrayEarthStart)}<br>`;
	buffer += `Earth vel: ${textTriplet(bonusData, arrayEarthStart+3)} → ${earthV.toFixed(3)}<br>`;

	buffer += `Mass: ${probeData[arrayProbeStart+6]}kg<br>`;

	// print the easly calculated length budget if tracking the easy data
	if (!trackBonus) {
		buffer += `WPSA: ${antennaText(probeData[arrayRangeWPSA], 12)}kbps<br>`;
		buffer += `DSS24: ${antennaText(probeData[arrayRangeDSS24], 34)}kbps<br>`;
		buffer += `DSS34: ${antennaText(probeData[arrayRangeDSS34], 34)}kbps<br>`;
		buffer += `DSS54: ${antennaText(probeData[arrayRangeDSS54], 34)}kbps<br>`;
	}

	overlayDOM.innerHTML = buffer;			// set the innerhtml to the newly generated buffer (this proved to be faster than writing to the DOM every time)
}

function setSize() {
	let box = canvasdiv.getBoundingClientRect();	// find the current bounding box

	// quit if pointless
	if (box.width === prevbox.width && box.height === prevbox.height)
		return;

	resizeCanvas(box.width, box.height);		// resize the dom element
	resizeTo(box.width, box.height);		// resize the canvas render resolution
	perspective(2 * atan(box.height / 2 / 800), box.width/box.height, 1, 10000000);	// recalculate the perspective box

	prevbox = box;					// update the previous box
}

function preload() {
	//window.MSStream was removed because IE it probably cant handle 8k textures lol (if you use IE, please get some help 🙏)
	let res = /iPad|iPhone|iPod/.test(navigator.userAgent) ? "4k" : "8k";

	// load the textures based on what resolution was chosen
	earthDayTex = loadImage('assets/' + res + '/earthDay.jpg');
	earthNightTex = loadImage('assets/' + res + '/earthNight.jpg');
	cloudsTex = loadImage('assets/' + res + '/clouds.jpg');
	moonTex = loadImage('assets/' + res + '/moon.jpg');

	// load the shaders
	earthShader = loadShader('src/earth.vert', 'src/earth.frag');
	atmoShader = loadShader('src/atmo.vert', 'src/atmo.frag');
	moonShader = loadShader('src/moon.vert', 'src/moon.frag');

	// probably gonna get rid of this one it kinda failed
	pass1Shader = loadShader('src/post.vert', 'src/pass1.frag');
}

function setup() {
	// main dom objects
	canvas = document.getElementById("canvas");
	canvasdiv = document.getElementById("canvasdiv");
	menu = document.getElementById("menu");
	overlayDOM = document.getElementById("overlaytext");

	// input dom objects
	followEarthDOM = document.getElementById("followEarth");
	followMoonDOM = document.getElementById("followMoon");
	followProbeDOM = document.getElementById("followProbe");

	timeDOM = document.getElementById("time");
	strokeDOM = document.getElementById("stroke");
	speedDOM = document.getElementById("speed");
	timeSliderDOM = document.getElementById("timeslider");

	prevbox = canvasdiv.getBoundingClientRect();	// set the bounding box for the first time

	createCanvas(prevbox.width, prevbox.height, WEBGL, canvas);	// create the canvas using the box
	camera = createCamera();			// create the camera
	camera.camera(earthRadius * 3, earthRadius * 2, -earthRadius * 3, 0, 0, 0, 0, -1, 0);	// 0, -1, 0 to make coordinate system right handed

	perspective(2 * atan(prevbox.height / 2 / 800), prevbox.width/prevbox.height, 1, 10000000);	// initialize the camera

	background(0);					// clear background as quick as posible
	noFill();					// default to nofill
	strokeWeight(100);				// default strokeweight

	document.getElementById("loading").style.display = "none";	// remove the loading animation
}

function draw() {
	setSize();					// check if size has changed and adjust if it has

	if (!(baseReady && bonusReady))			// stall until the data has been loaded (kinda hacky solution)
		return;

	orbitControl(2, 2, 0.5);			// default orbit controls are wack
	background(0);

	// set the current data points based on time
	let baseData = dataWeightedAverage(baseArr, time);
	let bonusData = dataWeightedAverage(bonusArr, time);

	// run each handler
	handleEarth(baseData, bonusData);
	handleMoon(bonusData);
	handleRocket(baseData, bonusData);
	handleText(baseData, bonusData);
	handleAxes();

	//pass1Shader();

	if (playing)					// increment time if playing
		setTime(time + speed * deltaTime / 1000);
}

function keyPressed() {
	if (keyCode == 27) {				// one esc key press show/hide menu
		menu.classList.toggle("hidden");
		canvasdiv.classList.toggle("small");
	}
}

// disable all except selected and update values (ik its just radio buttons)
function handleFollowButtons(selected) {
	if (selected != "earth")
		followEarthDOM.checked = false;
	if (selected != "moon")
		followMoonDOM.checked = false;
	if (selected != "probe")
		followProbeDOM.checked = false;

	followEarth = followEarthDOM.checked;
	followMoon = followMoonDOM.checked;
	followProbe = followProbeDOM.checked;
}

// parse the time and both dom elements to match it
function setTime(input) {
	time = parseFloat(input);

	if (input == "" || isNaN(time))			// default to 0 if bad input
		time = 0;

	timeDOM.value = input;				// set it to original in case of mis-input
	timeSliderDOM.value = time;			// needs to be valid
}
