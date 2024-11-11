const tanMult = 5000;
const arrayEarthStart = 8, arrayMoonStart = 14, arrayProbeStart = 1;
const arrayProbeMass = 7;
const earthRadius = 6378.137, moonRadius = 1737.4;


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

function dataWeightedAverage(time) { return null; }

var rocketPath;
var arrReady = false;
var time = 0;

var followEarth = false, followMoon = false, followProbe = false;
var useEarthTexture = false;
var followEarthDOM, followMoonDOM, followProbeDOM;
var timeDOM, strokeDOM, speedDOM;
var timeSliderDOM;
var overlayDOM;
var showAxes = false, showText = false, playing = false, speed = 10;

var canvasdiv, menu;
var prevcanvasbox;

var earthTex;

var arr, key;
fetch('src/flightpath.csv').then(response => {
	return response.text(); // Extract the text from the response
}).then(text => {
	let data = text.split("\n");
	key = data[0].split(",");
	arr = [...Array(key.length)].map(e => []);
	for (let i = 1; i < data.length-1; i++) {
		let row = data[i].split(",");
		for (let j = 0; j < key.length; j++) {
			arr[j].push(parseFloat(row[j]));
		}
	}
	delete data;
	dataWeightedAverage = time => {
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

	arrReady = true;
});


function handleRocket(data) {
	if (!arrReady)
		return;

	let x = data[arrayProbeStart];
	let y = data[arrayProbeStart+1];
	let z = data[arrayProbeStart+2];

	let xv = data[arrayProbeStart+3];
	let yv = data[arrayProbeStart+4];
	let zv = data[arrayProbeStart+5];

	if (followProbe) {
		let camDeltaX = camera.eyeX - camera.centerX;
		let camDeltaY = camera.eyeY - camera.centerY;
		let camDeltaZ = camera.eyeZ - camera.centerZ;
		camera.camera(x + camDeltaX, y + camDeltaY, z + camDeltaZ, x, y, z, 0, -1, 0);
	}

	stroke(0,255,255);

	push();
	translate(x, y, z);
	sphere(500, 8, 4);
	pop();

	stroke(255,0,0);
	line(x, y, z, x + xv * tanMult, y + yv * tanMult, z + zv * tanMult);

	if (rocketPath) {
		stroke(255,255,0);
		model(rocketPath);
		return;
	}

	beginGeometry();
	for (let i = 0; i < arr[0].length-1; i++) {
		line(arr[arrayProbeStart][i], arr[arrayProbeStart+1][i], arr[arrayProbeStart+2][i], arr[arrayProbeStart][i+1], arr[arrayProbeStart+1][i+1], arr[arrayProbeStart+2][i+1]);
	}
	rocketPath = endGeometry();
	model(rocketPath);
}

function handleEarth(data) {
	if (!arrReady)
		return;

	let x = data[arrayEarthStart];
	let y = data[arrayEarthStart+1];
	let z = data[arrayEarthStart+2];

	if (followEarth) {
		let camDeltaX = camera.eyeX - camera.centerX;
		let camDeltaY = camera.eyeY - camera.centerY;
		let camDeltaZ = camera.eyeZ - camera.centerZ;
		camera.camera(x + camDeltaX, y + camDeltaY, z + camDeltaZ, x, y, z);
	}

	stroke(0, 0, 255);

	push();
	if (useEarthTexture)
		texture(earthTex);
	translate(x, y, z);
	rotateX(-PI);
	rotateY(HALF_PI);
	rotateZ(-0.40910518);
	rotateY(0.0043752689390883629091912824047036316217347442667247770055869327107291376933374649965090290441628832370979032264616092647931526225026442232147712881989155271345349586303407442060355058319830324161455127*time);
	sphere(earthRadius, 16, 8);
	pop();
}

function handleMoon(data) {
	if (!arrReady)
		return;

	let x = data[arrayMoonStart];
	let y = data[arrayMoonStart+1];
	let z = data[arrayMoonStart+2];

	if (followMoon) {
		let camDeltaX = camera.eyeX - camera.centerX;
		let camDeltaY = camera.eyeY - camera.centerY;
		let camDeltaZ = camera.eyeZ - camera.centerZ;
		camera.camera(x + camDeltaX, y + camDeltaY, z + camDeltaZ, x, y, z);
	}

	stroke(255);

	push();
	translate(x, y, z);
	sphere(moonRadius, 12, 6);
	pop();
}

function drawAxes() {
	if (!showAxes)
		return;

	stroke(255,0,0);
	line(0,0,0,7500,0,0);
	push();
	translate(7500, 0, 0);
	sphere(500, 8, 4);
	pop();

	stroke(0,255,0);
	line(0,0,0,0,7500,0);
	push();
	translate(0, 7500, 0);
	sphere(500, 8, 4);
	pop();

	stroke(0,0,255);
	line(0,0,0,0,0,7500);
	push();
	translate(0, 0, 7500);
	sphere(500, 8, 4);
	pop();
}

function drawText(data) {
	if (!showText || !arrReady)
		return;

	let framerate = frameRate();
	let probeX = data[arrayProbeStart];
	let probeY = data[arrayProbeStart+1];
	let probeZ = data[arrayProbeStart+2];
	let probeXV = data[arrayProbeStart+3];
	let probeYV = data[arrayProbeStart+4];
	let probeZV = data[arrayProbeStart+5];
	let probeV = sqrt(probeXV**2 + probeYV**2 + probeZV**2);
	let moonX = data[arrayMoonStart];
	let moonY = data[arrayMoonStart+1];
	let moonZ = data[arrayMoonStart+2];
	let moonXV = data[arrayMoonStart+3];
	let moonYV = data[arrayMoonStart+4];
	let moonZV = data[arrayMoonStart+5];
	let moonV = sqrt(moonXV**2 + moonYV**2 + moonZV**2);
	let earthX = data[arrayEarthStart];
	let earthY = data[arrayEarthStart+1];
	let earthZ = data[arrayEarthStart+2];
	let earthXV = data[arrayEarthStart+3];
	let earthYV = data[arrayEarthStart+4];
	let earthZV = data[arrayEarthStart+5];
	let earthV = sqrt(earthXV**2 + earthYV**2 + earthZV**2);

	overlayDOM.innerHTML = `FPS: ${framerate.toFixed(3)} Time: ${time.toFixed(3)}<br>`;
	overlayDOM.innerHTML += `Probe pos: ${probeX.toFixed(3)}, ${probeY.toFixed(3)}, ${probeZ.toFixed(3)}<br>`;
	overlayDOM.innerHTML += `Probe vel: ${probeXV.toFixed(3)}, ${probeYV.toFixed(3)}, ${probeZV.toFixed(3)} → ${probeV.toFixed(3)}<br>`;
	overlayDOM.innerHTML += `Moon pos: ${moonX.toFixed(3)}, ${moonY.toFixed(3)}, ${moonZ.toFixed(3)}<br>`;
	overlayDOM.innerHTML += `Moon vel: ${moonXV.toFixed(3)}, ${moonYV.toFixed(3)}, ${moonZV.toFixed(3)} → ${moonV.toFixed(3)}<br>`;
	overlayDOM.innerHTML += `Earth pos: ${earthX.toFixed(3)}, ${earthY.toFixed(3)}, ${earthZ.toFixed(3)}<br>`;
	overlayDOM.innerHTML += `Earth vel: ${earthXV.toFixed(3)}, ${earthYV.toFixed(3)}, ${earthZV.toFixed(3)} → ${earthV.toFixed(3)}<br>`;
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
	earthTex = loadImage('assets/dayTimeEarth.jpg');
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
	orbitControl();
	background(0);

	let data = dataWeightedAverage(time);

	handleEarth(data);
	handleMoon(data);
	handleRocket(data);
	drawAxes();
	drawText(data);

	if (playing) {
		setTime(time + speed * deltaTime / 1000);
	}
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
	if (input == "") {
		time = 0;
		return;
	}

	time = parseFloat(input);
	if (isNaN(time))
		time = 0;

	timeDOM.value = input;
	timeSliderDOM.value = time;
}

function linkB(dr, slantr) {
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

alert(linkB(34, 336217.2642));
