import math

lat = 39.5
long = -75.48
radLat = lat * (math.pi / 180)
radLon = long * (math.pi / 180)
print(math.cos(lat))
print(math.cos(long))
print(math.cos(radLat))
print(math.cos(radLon))