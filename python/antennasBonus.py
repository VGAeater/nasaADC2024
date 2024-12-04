import math
import csv
import numpy as np  # For matrix operations


# Finds the distance between 2 points
def distance(antennaCords, probeCords):
   first = (probeCords[0] - antennaCords[0])**2
   second = (probeCords[1] - antennaCords[1])**2
   third = (probeCords[2] - antennaCords[2])**2
   tot = math.sqrt(first + second + third)
   return tot


# This is a bit over-complicated cuz SOMEONE (stratton) wanted me to make him a function that could do matrix multiplication of the earth
def rotationMatrix(timeElapsed):
   # Earth's angular velocity per minute
   #For extreme precision:    earthAngularVelocity = 0.0043752689390883629091912824047036316217347442667247770055869327107291376933374649965090290441628832370979032264616092647931526225026442232147712881989155271345349586303407442060355058319830324161455127
   earthAngularVelocity = 0.00437526893908836290919128240470


   # Initializes the rotation angles
   #THis is the main one earth spins on
   thetaZ = earthAngularVelocity * timeElapsed 
   # This is the tilt of earth (in radians)
   thetaX = 0.40910518 
   # This is useless but stratton wanted it
   thetaY = 0 


   # Rotation matrices (got these on wikipedia cuz i am NOT doing ts myself)
   rX = np.array([
       [1, 0, 0],
       [0, math.cos(thetaX), -math.sin(thetaX)],
       [0, math.sin(thetaX), math.cos(thetaX)]
   ])
   rY = np.array([
       [math.cos(thetaY), 0, math.sin(thetaY)],
       [0, 1, 0],
       [-math.sin(thetaY), 0, math.cos(thetaY)]
   ])
   rZ = np.array([
       [math.cos(thetaZ), -math.sin(thetaZ), 0],
       [math.sin(thetaZ), math.cos(thetaZ), 0],
       [0, 0, 1]
   ])


   # Multiplies and returns the 3 matricies
   return rY @ rZ @ rX
#
def antennaLoc(i, timeElapsed):
   # All of this is from the handbook
   data = [
       [35.3399, -116.875, 0.951499],
       [-35.3985, 148.982, 0.69202],
       [40.4256, -4.2541, 0.837051],
       [37.9273, -75.475, -0.019736]
   ]
   # same with this
   earthRadius = 6378.137
   # Adds the earth radus and the terrain height
   totalRadius = earthRadius + data[i][2]
   # Converts the lat and long to radians
   radLat = data[i][0] * (math.pi / 180)
   radLon = data[i][1] * (math.pi / 180)


   # Used the math from the handbook to change it into x,y,z cords
   x = totalRadius * math.cos(radLat) * math.cos(radLon)
   y = totalRadius * math.cos(radLat) * math.sin(radLon)
   z = totalRadius * math.sin(radLat)
   # Makes it into a numpy array
   initialPos = np.array([x, y, z])
   # Apply rotation matrix and the current time
   rotation = rotationMatrix(timeElapsed)
   # Multiplies the orginal rotation and the result of the rotation
   rotatedPos = rotation @ initialPos
   return rotatedPos.tolist()


def main():
   antenna = [0, 0, 0]
   probe = [0, 0, 0]
   elapsedTime = 0 


   with open('../assets/bonus.csv', mode='r') as file:
       data = list(csv.reader(file))
       for i in range(1, len(data)-1):
           elapsedTime = float(data[i][0])
           antenna = antennaLoc(1, elapsedTime)
           probe[0] = float(data[i][1])
           probe[1] = float(data[i][2])
           probe[2] = float(data[i][3])
           print("Minute: ", elapsedTime)
           print("Antenna Cords:", antenna)
           print("Probe Cords: ", probe)
           print("Distance: ", distance(antenna, probe))


main()