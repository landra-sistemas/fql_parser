export default function isEmpty(value) {
    if (value == null) {
        return true;
    }

    if (Array.isArray(value) || typeof value === "string") {
        return value.length === 0;
    }

    if (typeof value === "object") {
        return Object.keys(value).length === 0;
    }

    return false;
}