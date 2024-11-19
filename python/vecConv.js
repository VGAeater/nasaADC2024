// This is just a matrix multiplication function I found online cuz i aint writing allat and I couldn't find a library
function multMatrices(a ,b){
    if(a[0].length !== b.length){
        throw new Error("Nuh Uh!!! You can't do that!!!");
    }

    let result = [];
    for (let i = 0; i < a.length; i++) {
        result[i] = [];
        for (let j = 0; j < b[0].length; j++) {
            let sum = 0;
            for (let k = 0; k < a[0].length; k++) {
                sum += a[i][k] * b[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
}

//Takes the random ahhh thing stratton wanted and multiplies it by the vecotr 3 (after adding a 1)
function vecReflection(vec, a, b, c, d){
    // weird ahhh rotation matrix from the wikipedia u sent me
    let mat = [[1-2*(a**2), -2*a*b, -2*a*c, -2*a*d], 
               [-2*a*b, 1-2*(b**2), -2*b*c, -2*b*d], 
               [-2*a*c, -2*b*c, 1-2*(c**2), -2*c*d], 
               [0, 0, 0, 1]];
    // turns the vector into a 4x1 so that multiplication works
    let newVec = [[vec[0]], [vec[1]], [vec[2]], [1]];
    // Multiplies the 2 matrices
    let resultMatrix = multMatrices(mat, newVec)
    // Converts it from a 4x1 array to a 1x4 array (flat)
    resultMatrix = resultMatrix.map(row => row[0]);
    // Removes the last one to bring it back to a 1x3 matrix
    resultMatrix = resultMatrix.pop();

}

function main(){
    // this should be in the form: ax+by+cz+d=0.
    a = 1
    b = 2
    c = 3
    d = 4
    x = 5
    y = 6
    z = 7
    let vec3 = [x, y, z];
    console.log(vecReflection(vec3, a, b, c, d));
}

main()