const connection = new signalR.HubConnectionBuilder()
    .withUrl("/tictactoehub")
    .build();

let isHost = true; 
let board = Array(9).fill("");
let myTurn = false;
let mySymbol = "";       
let opponentSymbol = ""; 
let gameOver = false;
let xWins = 0;
let oWins = 0;
let readyCount = 0;
let localReady = false;

function updateReadyStatus() {
    const statusEl = document.getElementById("readyStatus");
    statusEl.innerText = `Ready ${readyCount}/2`;
}

function restartGame() {
    board = Array(9).fill("");
    gameOver = false;
    document.querySelectorAll(".cell").forEach(cell => {
        cell.innerText = "";
        cell.classList.remove("x", "o");
    });
    document.querySelectorAll(".winning-line").forEach(line => line.remove());

    document.querySelectorAll(".overlay-message").forEach(overlay => overlay.remove());

    readyCount = 0;
    localReady = false;
    updateReadyStatus();
    document.getElementById("winnerMessage").classList.remove("show");
    myTurn = isHost ? true : false;
    console.log("Game restarted.");
}

function checkWinner() {
    const winningCombos = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ];
    for (const combo of winningCombos) {
        const [a, b, c] = combo;
        if (board[a] !== "" && board[a] === board[b] && board[a] === board[c]) {
            return combo;
        }
    }
    return null;
}

function drawWinningLine(cellIndices) {
    const firstCell = document.querySelector(`.cell[data-index="${cellIndices[0]}"]`);
    const lastCell = document.querySelector(`.cell[data-index="${cellIndices[cellIndices.length - 1]}"]`);
    const boardEl = document.querySelector('.board');
    const boardRect = boardEl.getBoundingClientRect();

    const firstRect = firstCell.getBoundingClientRect();
    const lastRect = lastCell.getBoundingClientRect();

    const startX = firstRect.left - boardRect.left + firstCell.offsetWidth / 2;
    const startY = firstRect.top - boardRect.top + firstCell.offsetHeight / 2;
    const endX = lastRect.left - boardRect.left + lastCell.offsetWidth / 2;
    const endY = lastRect.top - boardRect.top + lastCell.offsetHeight / 2;

    const lineLength = Math.hypot(endX - startX, endY - startY);
    const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

    const lineDiv = document.createElement('div');
    lineDiv.classList.add('winning-line');
    lineDiv.style.width = lineLength + 'px';
    lineDiv.style.top = startY + 'px';
    lineDiv.style.left = startX + 'px';
    lineDiv.style.transform = `rotate(${angle}deg)`;

    boardEl.appendChild(lineDiv);
    return lineDiv;
}

function animateWinner(combo, winnerSymbol) {
    const winningLine = document.querySelector('.winning-line');
    if (!winningLine) return;

    const firstCell = document.querySelector(`.cell[data-index="${combo[0]}"]`);
    const boardEl = document.querySelector('.board');
    const boardRect = boardEl.getBoundingClientRect();
    const cellRect = firstCell.getBoundingClientRect();

    const finalX = cellRect.left - boardRect.left + firstCell.offsetWidth / 2;
    const finalY = cellRect.top - boardRect.top + firstCell.offsetHeight / 2;

    winningLine.classList.add("animate");
    winningLine.style.left = finalX + "px";
    winningLine.style.top = finalY + "px";

    winningLine.addEventListener("transitionend", function handler() {
        winningLine.removeEventListener("transitionend", handler);
        const winnerMessage = document.getElementById("winnerMessage");
        winnerMessage.innerText = "Winner: " + winnerSymbol;
        winnerMessage.classList.add("show");
    });
}


function showOverlayMessage(message) {
    const boardEl = document.querySelector('.board');

    let existingOverlay = document.querySelector('.overlay-message');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    let overlay = document.createElement('div');
    overlay.classList.add('overlay-message');
    overlay.innerText = message;

    boardEl.appendChild(overlay);

    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
}

function handleMove(index, symbol) {
    if (gameOver || board[index] !== "") return;

    board[index] = symbol;
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    cell.innerText = symbol;
    cell.classList.add(symbol.toLowerCase());

    const winningCombo = checkWinner();
    if (winningCombo) {
        gameOver = true;
        console.log("Νικηφόρος συνδυασμός:", winningCombo);
        drawWinningLine(winningCombo);
        animateWinner(winningCombo, symbol);
        showOverlayMessage("Winner: " + symbol);
    } else if (board.every(cellValue => cellValue !== "")) {
        gameOver = true;
        console.log("Ισοπαλία");
        showOverlayMessage("Draw: XO");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".cell").forEach(cell => {
        cell.addEventListener("click", function () {
            const index = parseInt(this.getAttribute("data-index"));
            console.log("Κλικ στο κελί με index: " + index + ", myTurn: " + myTurn);
            if (myTurn && board[index] === "" && !gameOver) {
                handleMove(index, mySymbol);
                myTurn = false;
                connection.invoke("SendMove", index)
                    .catch(err => console.error("Error: " + err.toString()));
            }
        });
    });

    const restartBtn = document.getElementById("restartBtn");
    if (restartBtn) {
        restartBtn.addEventListener("click", function () {
            if (!localReady) {
                localReady = true;
                connection.invoke("PlayerReady")
                    .catch(err => console.error("Error: " + err.toString()));
            }
        });
    }
});

connection.on("ReceiveMove", function (cellIndex) {
    if (gameOver) return;
    handleMove(cellIndex, opponentSymbol);
    myTurn = true;
});

connection.on("ReceiveRestartReady", function () {
    readyCount++;
    updateReadyStatus();
    console.log("Restart ready count: " + readyCount);
    if (readyCount === 2) {
        restartGame();
    }
});

connection.start().then(function () {
    if (isHost) {
        mySymbol = "X";
        opponentSymbol = "O";
        myTurn = true;
        console.log("Είστε ο παίκτης X και ξεκινάτε!");
    } else {
        mySymbol = "O";
        opponentSymbol = "X";
        myTurn = false;
        console.log("Είστε ο παίκτης O και περιμένετε για την κίνηση του X!");
    }
}).catch(err => console.error(err.toString()));

function updateWinCounter() {
    document.getElementById("xWins").innerText = xWins;
    document.getElementById("oWins").innerText = oWins;
}

function handleMove(index, symbol) {
    if (gameOver || board[index] !== "") return;

    board[index] = symbol;
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    cell.innerText = symbol;
    cell.classList.add(symbol.toLowerCase());

    const winningCombo = checkWinner();
    if (winningCombo) {
        gameOver = true;
        console.log("Νικηφόρος συνδυασμός:", winningCombo);
        drawWinningLine(winningCombo);
        animateWinner(winningCombo, symbol);
        if (symbol === "X") {
            xWins++;
        } else if (symbol === "O") {
            oWins++;
        }
        updateWinCounter();
        showOverlayMessage("Winner: " + symbol);
    } else if (board.every(cellValue => cellValue !== "")) {
        gameOver = true;
        console.log("Ισοπαλία");
        showOverlayMessage("Draw: XO");
    }
}
