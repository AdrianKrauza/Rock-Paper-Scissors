let move, pcMove
let scoreP = 0
let scorePc = 0
let losMove = ['paper', 'rock', 'scissors']



const el = document.getElementsByClassName('img')
const win = (whoWin) => {
    if (whoWin == "Computer Wins") {
        scorePc++
    } else if (whoWin == "Player Wins") {
        scoreP++
    }
    document.getElementById('whoWin').innerHTML = whoWin
    document.getElementById('whoWin').style.display = "block"
    document.getElementById('whoWin').style.opacity = 1
    document.getElementById('score').innerHTML = `Player ${scoreP} : ${scorePc}  Computer`
    setTimeout(() => {
        document.getElementById('fight').style.opacity = 0
        document.getElementById('whoWin').style.opacity = 0
        setTimeout(() => {
            document.getElementById('fight').style.display = "none"
            document.getElementById('img').style.display = "flex"
            document.getElementById('img').style.opacity = 1
            document.getElementById('whoWin').style.display = "none"
        document.getElementById('move').style.opacity = 1
        }, 1000);
    }, 1500);
}
for (let i = 0; i < el.length; i++) {
    el[i].onclick = function (e) {
        move = e.path[0].alt
        document.getElementById('img').style.opacity = 0
        document.getElementById('move').style.opacity = 0
        setTimeout(() => {
            pcMove = losMove[Math.floor(Math.random() * (2 - 0 + 1)) + 0]
            document.getElementById('img').style.display = "none"
            document.getElementById('fight').style.display = "flex"
            document.getElementById('human').src = `./img/${move}.png`
            document.getElementById('pc').src = `./img/${pcMove}.png`
            setTimeout(() => {
                document.getElementById('fight').style.opacity = 1
                if (move == "paper" && pcMove == "rock") {
                    win("Player Wins")
                } else if (move == "rock" && pcMove == "paper") {
                    win("Computer Wins")
                } else if (move == "paper" && pcMove == "scissors") {
                    win("Computer Wins")
                } else if (move == "scissors" && pcMove == "paper") {
                    win("Player Wins")
                } else if (move == "scissors" && pcMove == "rock") {
                    win("Computer Wins")
                } else if (move == "rock" && pcMove == "scissors") {
                    win("Player Wins")
                } else if (move == pcMove) {
                    win("It is a tie")
                }
            }, 500);
        }, 500);

    }
}
//P R
//R P
//P S

//S P
//S R
//R S

//R R
//S S
//P P