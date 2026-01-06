// Timing helper (used to animate steps) 
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

//Activity log helper (adds a new line, highlights newest)
function logEvent(message) {
    const log = document.getElementById("activityLog");
    if (!log) return;

    Array.from(log.children).forEach(child => child.classList.remove("is-active"));
    const line = document.createElement("div");
    line.className = "log-line is-active";
    line.innerText = message;
    log.prepend(line);

    while (log.children.length > 10) {
        log.removeChild(log.lastChild);
    }
}

//Operation label helper (single-line status text)
function setOperation(text) {
    const op = document.getElementById("operation");
    if (op) op.innerText = text;
}

//Parse input like: "5, 3 8,1" -> [5,3,8,1] (returns null if invalid/empty)
function parseArrayInput(raw) {
    const trimmed = (raw || "").trim();
    if (!trimmed) return null;

    const parts = trimmed.split(/[\s,]+/).filter(Boolean);
    const nums = parts.map(p => parseInt(p, 10));
    if (nums.some(n => Number.isNaN(n))) return null;
    return nums;
}

//Generate a small random array for quick demos
function randomArray(n = 12, max = 50) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(5 + Math.floor(Math.random() * max));
    return out;
}

//Render the current array as bars, with optional highlights
// active: currently moved/swapped element(s)
// compare: items being compared
// fixed: indices already in final position
function renderBars(arr, { active = [], compare = [], fixed = [] } = {}) {
    const container = document.getElementById("bars");
    if (!container) return;
    container.innerHTML = "";

    const maxVal = Math.max(...arr, 1);

    arr.forEach((v, i) => {
        const bar = document.createElement("div");
        bar.className = "bar";

        if (active.includes(i)) bar.classList.add("is-active");
        if (compare.includes(i)) bar.classList.add("is-compare");
        if (fixed.includes(i)) bar.classList.add("is-fixed");

        bar.style.height = `${Math.max(18, Math.round((v / maxVal) * 240))}px`;

        const label = document.createElement("div");
        label.className = "label";
        label.innerText = String(v);

        bar.appendChild(label);
        container.appendChild(bar);
    });
}

//Sorting algorithms (all mutate `arr` in-place)
const sorts = {
    bubble: {
        name: "Bubble Sort",
        run: async ({ arr }) => {
            // Bubble Sort: push the largest to the end each pass
            const fixed = [];
            for (let end = arr.length - 1; end > 0; end--) {
                for (let i = 0; i < end; i++) {
                    renderBars(arr, { compare: [i, i + 1], fixed });
                    logEvent(`Compare ${arr[i]} and ${arr[i + 1]}`);
                    await sleep(220);

                    if (arr[i] > arr[i + 1]) {
                        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                        renderBars(arr, { active: [i, i + 1], fixed });
                        logEvent(`Swap`);
                        await sleep(260);
                    }
                }
                fixed.push(end);
                renderBars(arr, { fixed });
                await sleep(120);
            }
            fixed.push(0);
            renderBars(arr, { fixed });
        },
    },
    selection: {
        name: "Selection Sort",
        run: async ({ arr }) => {
            // Selection Sort: select min from [i..end] and swap into i
            const fixed = [];
            for (let i = 0; i < arr.length; i++) {
                let min = i;
                logEvent(`Select position ${i}`);
                renderBars(arr, { active: [i], compare: [min], fixed });
                await sleep(200);

                for (let j = i + 1; j < arr.length; j++) {
                    renderBars(arr, { active: [i], compare: [min, j], fixed });
                    logEvent(`Compare min ${arr[min]} with ${arr[j]}`);
                    await sleep(200);
                    if (arr[j] < arr[min]) {
                        min = j;
                        renderBars(arr, { active: [i], compare: [min], fixed });
                        logEvent(`New min ${arr[min]}`);
                        await sleep(220);
                    }
                }

                if (min !== i) {
                    [arr[i], arr[min]] = [arr[min], arr[i]];
                    renderBars(arr, { active: [i, min], fixed });
                    logEvent(`Swap into place`);
                    await sleep(260);
                }

                fixed.push(i);
                renderBars(arr, { fixed });
                await sleep(120);
            }
        },
    },
    insertion: {
        name: "Insertion Sort",
        run: async ({ arr }) => {
            // Insertion Sort: grow a sorted prefix by shifting larger items right
            const fixed = [0];
            renderBars(arr, { fixed });

            for (let i = 1; i < arr.length; i++) {
                const key = arr[i];
                let j = i - 1;

                logEvent(`Insert ${key}`);
                renderBars(arr, { active: [i], fixed });
                await sleep(220);

                while (j >= 0 && arr[j] > key) {
                    renderBars(arr, { compare: [j, j + 1], fixed });
                    logEvent(`Shift ${arr[j]} right`);
                    await sleep(220);
                    arr[j + 1] = arr[j];
                    j--;
                    renderBars(arr, { active: [j + 1], fixed });
                    await sleep(180);
                }

                arr[j + 1] = key;
                fixed.length = 0;
                for (let k = 0; k <= i; k++) fixed.push(k);
                renderBars(arr, { active: [j + 1], fixed });
                logEvent(`Place ${key}`);
                await sleep(260);
            }

            renderBars(arr, { fixed: arr.map((_, i) => i) });
        },
    },
};

//UI wiring (dropdown + buttons)
(function init() {
    const algoSelect = document.getElementById("algoSelect");
    const input = document.getElementById("arrayInput");
    const randomBtn = document.getElementById("randomBtn");
    const sortBtn = document.getElementById("sortBtn");
    const resetBtn = document.getElementById("resetBtn");

    let arr = randomArray();
    let running = false;

    function setButtons(enabled) {
        [algoSelect, randomBtn, sortBtn, resetBtn].forEach(el => {
            if (!el) return;
            el.disabled = !enabled;
        });
    }

    // Reset highlights and re-render current array
    function resetVisual(message = "Ready.") {
        setOperation("Operation: None");
        logEvent(message);
        renderBars(arr);
    }

    // Run the selected algorithm (animated)
    async function run() {
        if (running) return;
        running = true;
        setButtons(false);

        const parsed = parseArrayInput(input.value);
        if (parsed && parsed.length) arr = parsed;

        const algo = sorts[algoSelect.value] || sorts.bubble;
        setOperation(`Operation: ${algo.name}`);
        logEvent(`Start ${algo.name}.`);
        renderBars(arr);

        await algo.run({ arr });

        setOperation("Operation: Done");
        logEvent("Done.");
        running = false;
        setButtons(true);
    }

    // Switch algorithm (does not reorder the array)
    algoSelect.addEventListener("change", () => {
        const algo = sorts[algoSelect.value] || sorts.bubble;
        setOperation("Operation: None");
        logEvent(`Selected ${algo.name}.`);
        renderBars(arr);
    });

    // New random data
    randomBtn.addEventListener("click", () => {
        if (running) return;
        arr = randomArray();
        input.value = arr.join(", ");
        logEvent("Randomized array.");
        renderBars(arr);
    });

    // Reset to current input (or random if input invalid/empty)
    resetBtn.addEventListener("click", () => {
        if (running) return;
        const parsed = parseArrayInput(input.value);
        arr = parsed && parsed.length ? parsed : randomArray();
        resetVisual("Reset.");
    });

    sortBtn.addEventListener("click", run);

    // Initial state
    input.value = arr.join(", ");
    resetVisual();
})();
