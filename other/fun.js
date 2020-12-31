function notify(msg) {
    console.log(`Message: ${msg}`);
};
function uint8ify(input) {
    return new Uint8Array(input)
};
function avarage(num1, num2) {
    return Math.round((num1 + num2) / 2);
};
function getD(x1, y1, x2, y2) {
    let d = Math.round(
        Math.pow(
            (Math.pow((x1 - x2), 2
            ) + Math.pow(
                (y1 - y2), 2
            )
            ), 0.5)
    );
    return d;
};

module.exports = { notify, uint8ify, avarage, getD };