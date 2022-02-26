const splitPatentheses = (str) => {
    const regex = /(?<=\().*(?=\))/g;

    let m;

    if ((m = regex.exec(str)) !== null) {
        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
            console.log(`Found match, group ${groupIndex}: ${match}`);
        });
    }

}


const parseQS = (str) => {
    const regex = /((?<key>[^\s|^:|^!:|^>:|^<:]+)(?<operator>:|!:|>:|<:)(?<value>[^\s|"]+|".*?"))? ?(?<join>OR|AND)? ?(?<plain>[\+|-][^\s]+)? ?/gm; // clave:valor clave2!:valor2
    let m;

    let data = {};
    while ((m = regex.exec(str)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        if (m === null) {
            continue;
        }
        let { key, value, operator } = m.groups;

        if (!operator) {
            operator = ":";
        }

        let type = "LIKE";
        switch (operator) {
            case ":":
            default:
                type = "LIKE";
                break;
            case "!:":
                type = "NOT LIKE";
                break;
        }

        if (key) {
            data[key] = {
                type: type,
                value: `${value}`,
            };
        }
    }
    return data;
}

export { parseQS, splitPatentheses };