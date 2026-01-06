// ----- Canvas + UI references -----
const canvas = document.getElementById("treeCanvas");
const ctx = canvas.getContext("2d");
const operationText = document.getElementById("operation");

// ----- Timing helper (used to animate search steps) -----
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ----- AVL state -----
let root = null;

// The node currently highlighted (used for step-by-step search visualization)
let highlightedNode = null;

// ----- Activity log helper -----
// Adds a new line on top and highlights it as the current activity.
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

// ----- AVL node -----
// `height` is maintained for balancing; `x/y` are computed for drawing.
class Node {
    constructor(value) {
        this.value = value;
        this.left = this.right = null;
        this.height = 1;
        this.x = this.y = 0;
    }
}

// ----- Height / balance helpers -----
function height(n) {
    return n ? n.height : 0;
}

function getBalance(n) {
    return n ? height(n.left) - height(n.right) : 0;
}

// ----- Rotations -----
// These mutate pointers and update heights, returning the new subtree root.
function rightRotate(y) {
    operationText.innerText = "Operation: Right Rotation";
    logEvent("Right rotation");
    const x = y.left;
    const t2 = x.right;
    x.right = y;
    y.left = t2;
    y.height = Math.max(height(y.left), height(y.right)) + 1;
    x.height = Math.max(height(x.left), height(x.right)) + 1;
    return x;
}

function leftRotate(x) {
    operationText.innerText = "Operation: Left Rotation";
    logEvent("Left rotation");
    const y = x.right;
    const t2 = y.left;
    y.left = x;
    x.right = t2;
    x.height = Math.max(height(x.left), height(x.right)) + 1;
    y.height = Math.max(height(y.left), height(y.right)) + 1;
    return y;
}

// ----- Insert (standard BST insert + AVL rebalance) -----
function insert(node, value) {
    if (!node) return new Node(value);
    if (value < node.value) node.left = insert(node.left, value);
    else if (value > node.value) node.right = insert(node.right, value);
    else return node;

    node.height = 1 + Math.max(height(node.left), height(node.right));
    const balance = getBalance(node);

    if (balance > 1 && value < node.left.value) return rightRotate(node);
    if (balance < -1 && value > node.right.value) return leftRotate(node);
    if (balance > 1 && value > node.left.value) {
        node.left = leftRotate(node.left);
        return rightRotate(node);
    }
    if (balance < -1 && value < node.right.value) {
        node.right = rightRotate(node.right);
        return leftRotate(node);
    }
    return node;
}

// ----- Search (step-by-step highlighting) -----
// Walks down the BST path, highlighting each visited node.
async function searchStepByStep(value) {
    let node = root;
    while (node) {
        highlightedNode = node;
        logEvent(`Check ${node.value}`);
        drawTree();
        await sleep(550);

        if (value === node.value) {
            operationText.innerText = `Operation: Found ${value}`;
            logEvent(`Found ${value}`);
            drawTree();
            return node;
        }

        node = value < node.value ? node.left : node.right;
    }

    highlightedNode = null;
    operationText.innerText = `Operation: ${value} not found`;
    logEvent(`${value} not found`);
    drawTree();
    return null;
}

// ----- Delete helpers -----
function minValueNode(node) {
    let curr = node;
    while (curr.left) curr = curr.left;
    return curr;
}

// ----- Delete (standard BST delete + AVL rebalance) -----
function deleteNode(node, value) {
    if (!node) return node;

    if (value < node.value) node.left = deleteNode(node.left, value);
    else if (value > node.value) node.right = deleteNode(node.right, value);
    else {
        if (!node.left || !node.right) node = node.left || node.right;
        else {
            const temp = minValueNode(node.right);
            node.value = temp.value;
            node.right = deleteNode(node.right, temp.value);
        }
    }

    if (!node) return node;

    node.height = 1 + Math.max(height(node.left), height(node.right));
    const balance = getBalance(node);

    if (balance > 1 && getBalance(node.left) >= 0) return rightRotate(node);
    if (balance > 1 && getBalance(node.left) < 0) {
        node.left = leftRotate(node.left);
        return rightRotate(node);
    }
    if (balance < -1 && getBalance(node.right) <= 0) return leftRotate(node);
    if (balance < -1 && getBalance(node.right) > 0) {
        node.right = rightRotate(node.right);
        return leftRotate(node);
    }
    return node;
}

// ----- Rendering pipeline -----
// 1) compute positions
// 2) draw red edges
// 3) draw square nodes (highlight if needed)
function drawTree() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!root) return;
    setPositions(root, canvas.width / 2, 50, canvas.width / 4);
    drawEdges(root);
    drawNodes(root);
}

// Assign x/y positions recursively (simple layout)
function setPositions(node, x, y, gap) {
    if (!node) return;
    node.x = x;
    node.y = y;
    setPositions(node.left, x - gap, y + 80, gap / 2);
    setPositions(node.right, x + gap, y + 80, gap / 2);
}

// Draw parent->child connectors (neatly attached to square node edges)
function drawEdges(node) {
    if (!node) return;
    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 2;
    if (node.left) {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y + NODE_SIZE / 2);
        ctx.lineTo(node.left.x, node.left.y - NODE_SIZE / 2);
        ctx.stroke();
    }
    if (node.right) {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y + NODE_SIZE / 2);
        ctx.lineTo(node.right.x, node.right.y - NODE_SIZE / 2);
        ctx.stroke();
    }
    drawEdges(node.left);
    drawEdges(node.right);
}

// Node drawing constants
const NODE_SIZE = 46;

// Rounded-rect helper (falls back for older canvas implementations)
function roundedRect(x, y, w, h, r) {
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
        return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
}

// Draw nodes as squares; the highlighted node uses the "search" color.
function drawNodes(node) {
    if (!node) return;
    const x = node.x - NODE_SIZE / 2;
    const y = node.y - NODE_SIZE / 2;

    ctx.beginPath();
    roundedRect(x, y, NODE_SIZE, NODE_SIZE, 10);

    if (highlightedNode === node) {
        ctx.fillStyle = "#fff2c6";
        ctx.strokeStyle = "#f1d27a";
        ctx.lineWidth = 3;
    } else {
        ctx.fillStyle = "#dff7e6";
        ctx.strokeStyle = "#e7e7f2";
        ctx.lineWidth = 2;
    }

    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1f2937";
    ctx.font = "800 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(node.value), node.x, node.y);

    drawNodes(node.left);
    drawNodes(node.right);
}

// ----- Input helpers -----
function getInputValue() {
    const valueInput = document.getElementById("valueInput");
    const v = parseInt(valueInput.value, 10);
    if (Number.isNaN(v)) return null;
    return v;
}

function clearInput() {
    document.getElementById("valueInput").value = "";
}

// ----- UI actions -----
function insertValue() {
    const v = getInputValue();
    if (v === null) return;
    highlightedNode = null;
    root = insert(root, v);
    operationText.innerText = "Operation: Insert " + v;
    logEvent("Insert " + v);
    drawTree();
    clearInput();
}

async function searchValue() {
    const v = getInputValue();
    if (v === null) return;
    operationText.innerText = "Operation: Search " + v;
    logEvent("Search " + v);
    await searchStepByStep(v);
    clearInput();
}

function deleteValue() {
    const v = getInputValue();
    if (v === null) return;
    highlightedNode = null;
    root = deleteNode(root, v);
    operationText.innerText = "Operation: Delete " + v;
    logEvent("Delete " + v);
    drawTree();
    clearInput();
}

function resetTree() {
    root = null;
    highlightedNode = null;
    operationText.innerText = "Operation: None";
    logEvent("Reset");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
