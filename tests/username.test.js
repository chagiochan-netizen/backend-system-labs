import test from "node:test";
import assert from "node:assert/strict";

function isValidUsername(username) {
    if (typeof username !== "string") {
        return false;
    }

    return username.length >= 5 && username.length <= 12;
}

test("Username có 13 ký tự phải không hợp lệ", () => {
    const result = isValidUsername("abcdefghijklm");

    assert.equal(result, false);
});

test("Username có 5 ký tự phải  hợp lệ", () => {
    const result = isValidUsername("abcde");

    assert.equal(result, true);
});

test("Username có 12 ký tự phải  hợp lệ", () => {
    const result = isValidUsername("abcdefghijkl");

    assert.equal(result, true);
});

test("Empty username must be invalid", () => {
    const result = isValidUsername("");

    assert.equal(result, false);
});

test("Null username must be invalid", () => {
    const result = isValidUsername(null);

    assert.equal(result, false);
});