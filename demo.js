// Input: nums = [0, 1, 0, 3, 12]
// Output: [1, 3, 12, 0, 0]
// let data = [0, 1, 0, 3, 12];
// let dataCount = 0;
// for (let index = 0; index < data.length; index++) {
//     if (data[index] != 0) {
//         data[dataCount] = data[index];
//         dataCount++;
//     }
// }
// while (dataCount < data.length) {
//     data[dataCount] = 0;
//     dataCount++;
// }
// console.log(data);

/**
 * Input: nums = [2, 7, 11, 15], target = 9
 * Output: [0, 1]
 */

// const nums = [2, 7, 11, 15];
// const target = 9;

// function twoSum(nums, target) {
//     const map = {};

//     for (let index = 0; index < nums.length; index++) {
//         const complement = target - nums[index];

//         if (map[complement] !== undefined) {
//             return [map[complement], index];
//         }
//         map[nums[index]] = index;
//     }

//     return [];
// }

// console.log(twoSum([2, 7, 11, 15], 9));


/**
 * Input: nums = [3,0,1]
 * Output: 2
 */

const nums = [3, 0, 1];

function missingNumber(nums) {
    const totalElement = nums.length;
    const totalSum = (totalElement * (totalElement + 1)) / 2;

    let sum = 0;
    for (let index = 0; index < nums.length; index++) {
        sum = sum + nums[index];
    }
    return totalSum - sum;
}

console.log(missingNumber(nums));
