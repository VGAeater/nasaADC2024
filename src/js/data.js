import * as c from "./constants.js";

export function data() {
	// finds the link budget for a specific range and radius of dish
	this.linkBudget = function(slantr, dr) {
		return 10**(23.517 + Math.log10(0.55 * (dr * Math.PI / 0.136363636363636)**2) - 2 * Math.log10(1333.3333333333333333 * slantr * Math.PI)) / 1000;
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
		let arr = [...Array(key.length)].map(e => []);

		for (let i = 1; i < data.length-1; i++) {
			let row = data[i].split(",");
			for (let j = 0; j < key.length; j++)
				arr[j].push(parseFloat(row[j]));
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

