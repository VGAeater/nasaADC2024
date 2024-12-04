export const arrayEarthStart = 8, arrayMoonStart = 14, arrayProbeStart = 1;
export const arrayProbeMass = 7;
export const arrayRangeWPSA = 9, arrayRangeDSS54 = 11, arrayRangeDSS24 = 13, arrayRangeDSS34 = 15;

// [ lat, long, relative alt, dish radius, starting position in data array ]
export const antennaPositions = [
	[35.3399*Math.PI/180, -116.875*Math.PI/180, 0.951499, 34, arrayRangeDSS24],
	[-35.3985*Math.PI/180, 148.982*Math.PI/180, 0.69202, 34, arrayRangeDSS34],
	[40.4256*Math.PI/180, -4.2541*Math.PI/180, 0.837051, 34, arrayRangeDSS54],
	[37.9273*Math.PI/180, -75.475*Math.PI/180, -0.019736, 12, arrayRangeWPSA]
];

export const tanMult = 5000;
export const earthRadius = 6378.137, moonRadius = 1737.4;
export const earthTilt = 0.40910518, earthRotation = 0.0043752689390883629091912824047036316217347442667247770055869327107291376933374649965090290441628832370979032264616092647931526225026442232147712881989155271345349586303407442060355058319830324161455127;

export const launchTime = new Date('2024-06-11T15:25:47');	// Launch time acc to handbook
