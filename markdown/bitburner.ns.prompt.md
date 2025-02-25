<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [bitburner](./bitburner.md) &gt; [NS](./bitburner.ns.md) &gt; [prompt](./bitburner.ns.prompt.md)

## NS.prompt() method

Prompt the player with an input modal.

**Signature:**

```typescript
prompt(
    txt: string,
    options?: { type?: "boolean" | "text" | "select"; choices?: string[] },
  ): Promise<boolean | string>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  txt | string | Text to appear in the prompt dialog box. |
|  options | { type?: "boolean" \| "text" \| "select"; choices?: string\[\] } | _(Optional)_ Options to modify the prompt the player is shown. |

**Returns:**

Promise&lt;boolean \| string&gt;

True if the player clicks “Yes”; false if the player clicks “No”; or the value entered by the player.

## Remarks

RAM cost: 0 GB

Prompts the player with a dialog box. Here is an explanation of the various options.

- `options.type` is not provided to the function. If `options.type` is left out and only a string is passed to the function, then the default behavior is to create a boolean dialog box.

- `options.type` has value `undefined` or `"boolean"`<!-- -->. A boolean dialog box is created. The player is shown "Yes" and "No" prompts, which return true and false respectively. The script's execution is halted until the player presses either the "Yes" or "No" button.

- `options.type` has value `"text"`<!-- -->. The player is given a text field to enter free-form text. The script's execution is halted until the player enters some text and/or presses the "Confirm" button.

- `options.type` has value `"select"`<!-- -->. The player is shown a drop-down field. Choosing type `"select"` will require an array to be passed via the `options.choices` property. The array can be an array of strings, an array of numbers (not BigInt numbers), or a mixture of both numbers and strings. Any other types of array elements will result in an error or an undefined/unexpected behavior. The `options.choices` property will be ignored if `options.type` has a value other than `"select"`<!-- -->. The script's execution is halted until the player chooses one of the provided options and presses the "Confirm" button.

## Example 1


```ts
// NS1
// A Yes/No question. The default is to create a boolean dialog box.
var queryA = "Do you enjoy Bitburner?";
var resultA = prompt(queryA);
tprint(queryA + " " + resultA);

// Another Yes/No question. Can also create a boolean dialog box by explicitly
// passing the option {"type": "boolean"}.
var queryB = "Is programming fun?";
var resultB = prompt(queryB, { type: "boolean" });
tprint(queryB + " " + resultB);

// Free-form text box.
var resultC = prompt("Please enter your name.", { type: "text" });
tprint("Hello, " + resultC + ".");

// A drop-down list.
var resultD = prompt("Please select your favorite fruit.", {
    type: "select",
    choices: ["Apple", "Banana", "Orange", "Pear", "Strawberry"]
});
tprint("Your favorite fruit is " + resultD.toLowerCase() + ".");
```

## Example 2


```ts
// NS2
// A Yes/No question. The default is to create a boolean dialog box.
const queryA = "Do you enjoy Bitburner?";
const resultA = await ns.prompt(queryA);
ns.tprint(`${queryA} ${resultA}`);

// Another Yes/No question. Can also create a boolean dialog box by explicitly
// passing the option {"type": "boolean"}.
const queryB = "Is programming fun?";
const resultB = await ns.prompt(queryB, { type: "boolean" });
ns.tprint(`${queryB} ${resultB}`);

// Free-form text box.
const resultC = await ns.prompt("Please enter your name.", { type: "text" });
ns.tprint(`Hello, ${resultC}.`);

// A drop-down list.
const resultD = await ns.prompt("Please select your favorite fruit.", {
    type: "select",
    choices: ["Apple", "Banana", "Orange", "Pear", "Strawberry"]
});
ns.tprint(`Your favorite fruit is ${resultD.toLowerCase()}.`);
```

