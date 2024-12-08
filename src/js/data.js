import * as c from "./constants.js";

export function data() {
	// finds the link budget for a specific range and radius of dish
	this.linkBudget = function(slantr, dr) {
		if (slantr == 0)
			return 0;

		let pt = 10;
		let gt = 9;
		let losses = 19.43;
		let nr = 0.55;
		let lam = 0.136363636363636;
		let kb = -228.6;
		let ts = 222;
		let first = pt + gt - losses;
		let dishCirc = dr * Math.PI;
		let second = 10 * Math.log10(nr * ((dishCirc / lam)**2));
		let slant = 4000 * slantr * Math.PI;
		let third = -20 * Math.log10(slant / lam);
		let fourth = -kb - 10 * Math.log10(22);
		let expo = (first + second + third + fourth) / 10;
		let bits = 10**expo;
		return bits / 1000;
	}

	/*
	 * special binary search algo that finds the lower of the indexes the
	 * value is between:
	 * x = 100;
	 * [ 98, 101 ];
	 * y = 0;
	 */
	this.binarySearchFloor = function(arr, el) {
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
	this.dataWeightedAverage = function(arr, time) {
		let timeIndex = this.binarySearchFloor(arr[0], time);

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
	this.buildArr = function(text) {
		let data = text.split("\n");
		let key = data[0].split(",");
		key.push("Total Distance");
		let arr = [...Array(key.length)].map(e => []);
		let totalDist = 0;

		for (let i = 1; i < data.length-1; i++) {
			let row = data[i].split(",");
			for (let j = 0; j < key.length - 1; j++)
				arr[j].push(parseFloat(row[j]));

			// dont count the first in total because it hasnt moved yet
			if (i == 1) {
				arr[arr.length - 1].push(0);
				continue;
			}

			// add the calculated total distance
			let s = c.arrayProbeStart;
			totalDist += Math.hypot(arr[s][i-1], arr[s+1][i-1], arr[s+2][i-1]);
			arr[arr.length - 1].push(totalDist);
		}

		return [arr, key];
	}

	// read base file
	this.baseArr, this.baseKey;
	this.baseReady = false;
	fetch('assets/updated.csv').then(response => {
		return response.text();
	}).then(text => {
		[this.baseArr, this.baseKey] = this.buildArr(text);
		this.baseReady = true;
	});

	// read bonus file
	this.bonusArr, this.bonusKey;
	this.bonusReady = false;
	fetch('assets/bonus.csv').then(response => {
		return response.text();
	}).then(text => {
		[this.bonusArr, this.bonusKey] = this.buildArr(text);
		this.bonusReady = true;
	});
}

