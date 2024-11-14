const tanMult = 5000;
const arrayEarthStart = 8, arrayMoonStart = 14, arrayProbeStart = 1;
const arrayProbeMass = 7;
const earthRadius = 6378.137, moonRadius = 1737.4;

const antennaPositions = [
	[35.3399*Math.PI/180, -116.875*Math.PI/180, 0.951499],
	[-35.3985*Math.PI/180, 148.982*Math.PI/180, 0.69202],
	[40.4256*Math.PI/180, -4.2541*Math.PI/180, 0.837051],
	[37.9273*Math.PI/180, -75.475*Math.PI/180, -0.019736]
];

var baseRocketPath, bonusRocketPath, moonPath;
var time = 0;

var followEarth = false, followMoon = false, followProbe = false;
var useTextures = false;
var followEarthDOM, followMoonDOM, followProbeDOM;
var timeDOM, strokeDOM, speedDOM;
var timeSliderDOM;
var overlayDOM;
var showAxes = false, showText = false, playing = false, speed = 10;

var trackBonus = false, showOtherPath = false;

var canvasdiv, menu;
var prevcanvasbox;

var earthDayTex, earthNightTex, moonTex, cloudsTex;
var earthShader, moonShader, atmoShader;

function linkBudget(dr, slantr) {
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

function buildArr(t) {
	let data = t.split("\n");
	let key = data[0].split(",");
	let arr = [...Array(key.length)].map(e => []);

	for (let i = 1; i < data.length-1; i++) {
		let row = data[i].split(",");
		for (let j = 0; j < key.length; j++)
			arr[j].push(parseFloat(row[j]));
	}

	return [arr, key];
}

var baseArr, baseKey;
var baseReady = false;
fetch('assets/base.csv').then(response => {
	return response.text();
}).then(text => {
	[baseArr, baseKey] = buildArr(text);
	baseReady = true;
});

var bonusArr, bonusKey;
var bonusReady = false;
fetch('assets/bonus.csv').then(response => {
	return response.text();
}).then(text => {
	[bonusArr, bonusKey] = buildArr(text);
	bonusReady = true;
});

function goToPosition(x, y, z) {
	let camDeltaX = camera.eyeX - camera.centerX;
	let camDeltaY = camera.eyeY - camera.centerY;
	let camDeltaZ = camera.eyeZ - camera.centerZ;
	camera.camera(x + camDeltaX, y + camDeltaY, z + camDeltaZ, x, y, z, 0, -1, 0);
}

function buildPath(arr, start) {
	for (let i = 0; i < arr[0].length-1; i++)
		line(arr[start][i], arr[start+1][i], arr[start+2][i], arr[start][i+1], arr[start+1][i+1], arr[start+2][i+1]);
}

function handleRocket(baseData, bonusData) {
	let x, y, z, xv, yv, zv;

	let data = trackBonus ? bonusData : baseData;

	x = data[arrayProbeStart];
	y = data[arrayProbeStart+1];
	z = data[arrayProbeStart+2];

	xv = data[arrayProbeStart+3];
	yv = data[arrayProbeStart+4];
	zv = data[arrayProbeStart+5];

	if (followProbe)
		goToPosition(x, y, z);

	stroke(0,255,255);

	push();
	translate(x, y, z);
	//rotateZ(createVector(x, y).heading());
	//rotateY(-createVector(x, y).heading());
	//console.log(createVector(x, y, z).angleBetween(createVector(0, 0, 0)));
	cone(500, 1000, 8);
	pop();

	stroke(255,0,0);
	line(x, y, z, x + xv * tanMult, y + yv * tanMult, z + zv * tanMult);

	if (!baseRocketPath) {
		beginGeometry();
		buildPath(baseArr, arrayProbeStart);
		baseRocketPath = endGeometry();
	}

	if (!bonusRocketPath) {
		beginGeometry();
		buildPath(bonusArr, arrayProbeStart);
		bonusRocketPath = endGeometry();
	}

	let mainPath = trackBonus ? bonusRocketPath : baseRocketPath;
	let secondaryPath = !trackBonus ? bonusRocketPath : baseRocketPath;

	stroke(255,255,0);
	model(mainPath);

	if (showOtherPath) {
		stroke(255,69,0);
		model(secondaryPath);
	}
}

function handleEarth(data) {
	let x = data[arrayEarthStart];
	let y = data[arrayEarthStart+1];
	let z = data[arrayEarthStart+2];

	if (followEarth)
		goToPosition(x, y, z);

	stroke(0, 0, 255);

	push();

	translate(x, y, z);
	rotateX(-PI);		// weird axes correction
	// tilt axis
	rotateX(-0.40910518);
	// rotate earth
	rotateY(0.0043752689390883629091912824047036316217347442667247770055869327107291376933374649965090290441628832370979032264616092647931526225026442232147712881989155271345349586303407442060355058319830324161455127 * time);

	push();

	rotateY(-HALF_PI);	// weird axes correction

	if (useTextures) {
		noStroke();
		shader(earthShader);
		earthShader.setUniform("dayTexture", earthDayTex);
		earthShader.setUniform("nightTexture", earthNightTex);
		earthShader.setUniform("lightDirection", createVector(1, 0, 0).array());
		earthShader.setUniform("resolution", [prevbox.width, prevbox.height]);
		fill(255);
		sphere(earthRadius, 64, 64);
	} else
		sphere(earthRadius, 16, 8);

	pop();

	// loop through antennas
	for (const pos of antennaPositions) {
		push();

		let r = earthRadius + pos[2];
		translate(r * cos(pos[0]) * cos(pos[1]), -r * sin(pos[0]), -r * cos(pos[0]) * sin(pos[1]));	// negatives for even more weird axes correction
		stroke(255, 0, 255);
		sphere(200, 4, 2);

		pop();
	}

	pop();
}

function handleMoon(data) {
	let x = data[arrayMoonStart];
	let y = data[arrayMoonStart+1];
	let z = data[arrayMoonStart+2];

	if (followMoon)
		goToPosition(x, y, z);

	stroke(255);

	push();
	translate(x, y, z);
	sphere(moonRadius, 12, 6);
	pop();

	stroke(255,255,0);
	if (moonPath) {
		model(moonPath);
		return;
	}

	beginGeometry();
	buildPath(bonusArr, arrayMoonStart);
	moonPath = endGeometry();
	model(moonPath);
}

function drawAxie(x, y, z) {
	stroke(x*255,y*255,z*255);
	line(0,0,0,x*7500,y*7500,z*7500);
	push();
	translate(x*7500, y*7500, z*7500);
	sphere(500, 8, 4);
	pop();
}

function drawAxes() {
	if (!showAxes)
		return;

	drawAxie(1,0,0);
	drawAxie(0,1,0);
	drawAxie(0,0,1);
}

function textTriplet(data, start) {
	return `${data[start].toFixed(3)}, ${data[start+1].toFixed(3)}, ${data[start+2].toFixed(3)}`;
}

function drawText(baseData, bonusData) {
	if (!showText)
		return;

	let probeData = trackBonus ? bonusData : baseData;

	let framerate = frameRate();
	let probeV = sqrt(probeData[arrayProbeStart+3]**2 + probeData[arrayProbeStart+4]**2 + probeData[arrayProbeStart+5]**2);
	let moonV = sqrt(bonusData[arrayMoonStart+3]**2 + bonusData[arrayMoonStart+4]**2 + bonusData[arrayMoonStart+5]**2);
	let earthV = sqrt(bonusData[arrayEarthStart+3]**2 + bonusData[arrayEarthStart+4]**2 + bonusData[arrayEarthStart+5]**2);

	overlayDOM.innerHTML = `FPS: ${framerate.toFixed(3)} Time: ${time.toFixed(3)}<br>`;
	overlayDOM.innerHTML += `Probe pos: ${textTriplet(probeData, arrayProbeStart)}<br>`;
	overlayDOM.innerHTML += `Probe vel: ${textTriplet(probeData, arrayProbeStart+3)} → ${probeV.toFixed(3)}<br>`;
	overlayDOM.innerHTML += `Moon pos: ${textTriplet(bonusData, arrayMoonStart)}<br>`;
	overlayDOM.innerHTML += `Moon vel: ${textTriplet(bonusData, arrayMoonStart+3)} → ${moonV.toFixed(3)}<br>`;
	overlayDOM.innerHTML += `Earth pos: ${textTriplet(bonusData, arrayEarthStart)}<br>`;
	overlayDOM.innerHTML += `Earth vel: ${textTriplet(bonusData, arrayEarthStart+3)} → ${earthV.toFixed(3)}<br>`;
	overlayDOM.innerHTML += `Mass: ${probeData[arrayProbeStart+6]}kg<br>`;
}

function setSize() {
	let box = canvasdiv.getBoundingClientRect();

	if (box.width === prevbox.width && box.height === prevbox.height)
		return;

	resizeCanvas(box.width, box.height);
	resizeTo(box.width, box.height);
	perspective(2 * atan(box.height / 2 / 800), box.width/box.height, 1, 10000000);

	prevbox = box;
}

function preload() {
	earthDayTex = loadImage('assets/earthDay.jpg');
	earthNightTex = loadImage('assets/earthNight.jpg');
	cloudsTex = loadImage('assets/clouds.jpg');
	moonTex = loadImage('assets/moon.jpg');

	earthShader = loadShader('src/earth.vert', 'src/earth.frag');
	atmoShader = loadShader('src/atmo.vert', 'src/atmo.frag');
	moonShader = loadShader('src/moon.vert', 'src/moon.frag');
}

function setup() {
	canvas = document.getElementById("canvas");
	canvasdiv = document.getElementById("canvasdiv");
	menu = document.getElementById("menu");

	followEarthDOM = document.getElementById("followEarth");
	followMoonDOM = document.getElementById("followMoon");
	followProbeDOM = document.getElementById("followProbe");

	timeDOM = document.getElementById("time");
	strokeDOM = document.getElementById("stroke");
	speedDOM = document.getElementById("speed");
	timeSliderDOM = document.getElementById("timeslider");

	overlayDOM = document.getElementById("overlaytext");

	prevbox = canvasdiv.getBoundingClientRect();

	createCanvas(prevbox.width, prevbox.height, WEBGL, canvas);
	camera = createCamera();
	camera.camera(earthRadius * 3, earthRadius * 2, -earthRadius * 3, 0, 0, 0, 0, -1, 0);	// 0, -1, 0 to make coordinate system right handed
	
	setSize();
	noFill();
	strokeWeight(100);
}

function draw() {
	setSize();

	if (!(baseReady && bonusReady))
		return;

	orbitControl(2, 2, 0.5);
	background(0);

	let baseData = dataWeightedAverage(baseArr, time);
	let bonusData = dataWeightedAverage(bonusArr, time);

	handleEarth(bonusData);
	handleMoon(bonusData);
	handleRocket(baseData, bonusData);
	drawText(baseData, bonusData);
	drawAxes();

	if (playing)
		setTime(time + speed * deltaTime / 1000);
}

function keyPressed() {
	if (keyCode == 27) {
		menu.classList.toggle("hidden");
		canvasdiv.classList.toggle("small");
	}
}

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

function setTime(input) {
	time = parseFloat(input);

	if (input == "" || isNaN(time))
		time = 0;

	timeDOM.value = input;
	timeSliderDOM.value = time;
}

