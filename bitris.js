//
// bitris
//

const blockTable = [
    // type0
    [
        // rotate0
        [
            [1, 1],
            [1, 1],
        ],
        // rotate1
        [
            [1, 1],
            [1, 1],
        ],
        // rotate2
        [
            [1, 1],
            [1, 1],
        ],
        // rotate3
        [
            [1, 1],
            [1, 1],
        ],
    ],
    // type1
    [
        // rotate0
        [
            [1, 1],
            [1, 0],
        ],
        // rotate1
        [
            [1, 1],
            [0, 1],
        ],
        // rotate2
        [
            [0, 1],
            [1, 1],
        ],
        // rotate3
        [
            [1, 0],
            [1, 1],
        ],
    ],
    // type2
    [
        // rotate0
        [
            [1, 1],
            [0, 0],
        ],
        // rotate1
        [
            [0, 1],
            [0, 1],
        ],
        // rotate2
        [
            [0, 0],
            [1, 1],
        ],
        // rotate3
        [
            [1, 0],
            [1, 0],
        ],
    ],
]

let field = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
];

const STATE_INIT = 1;
const STATE_TITLE = 2;
const STATE_START = 3;
const STATE_GAMEMAIN = 4;
const STATE_GAMEOVER = 5;

let gameState = STATE_INIT;

let moveXpos = 0;
let reqRotate = false;

let blockType = -1;
let blockXpos = 0;
let blockYpos = 0;
let blockRotate = 0;

let updateYposCount = 0;

let eraseLineWait = 0;

input.onButtonPressed(Button.A, () => {
    if (gameState == STATE_TITLE) {
        led.stopAnimation();
        gameState = STATE_START;
    } else if (gameState == STATE_GAMEMAIN && eraseLineWait == 0) {
        moveXpos = -1;
    }
})

input.onButtonPressed(Button.B, () => {
    if (gameState == STATE_TITLE) {
        led.stopAnimation();
        gameState = STATE_START;
    } else if (gameState == STATE_GAMEMAIN && eraseLineWait == 0) {
        moveXpos = 1;
    }
})

input.onButtonPressed(Button.AB, () => {
    if (gameState == STATE_TITLE) {
        led.stopAnimation();
        gameState = STATE_START;
    } else if (gameState == STATE_GAMEMAIN && eraseLineWait == 0) {
        reqRotate = true;
    }
})

basic.forever(() => {
    switch (gameState) {
        case STATE_INIT:
            init();
            break;
        case STATE_TITLE:
            title();
            break;
        case STATE_START:
            start();
            break;
        case STATE_GAMEMAIN:
            gameMain();
            break;
        case STATE_GAMEOVER:
            gameOver();
            break;
    }
})

function init() {
    gameState = STATE_TITLE;
}

function title() {
    basic.showString("bitris", 100);
}

function start() {
    basic.showString("START!");
    gameState = STATE_GAMEMAIN;
}

function gameMain() {
    if (eraseLineWait == 0) {
        if (blockType < 0) {
            // ブロック初期化
            blockType = Math.random(3);
            blockXpos = 1;
            blockYpos = -1;
            blockRotate = Math.random(4);

            updateYposCount = 50;
        }

        if (input.buttonIsPressed(Button.AB) == true) {
            // ブロック回転
            let newRotate = blockRotate + 1;
            if (newRotate > 3) {
                newRotate = 0
            }
            if (testBlock(blockType, blockXpos, blockYpos, newRotate) == 0) {
                blockRotate = newRotate;
            }

            reqRotate = false;
        }

        if (moveXpos != 0) {
            // ブロックX方向移動
            let newXpos = blockXpos + moveXpos;
            if (testBlock(blockType, newXpos, blockYpos, blockRotate) == 0) {
                blockXpos = newXpos;
            }

            moveXpos = 0;
        }

        if (--updateYposCount <= 0) {
            // ブロック落下
            let newYpos = blockYpos + 1;
            if (testBlock(blockType, blockXpos, newYpos, blockRotate) == 0) {
                blockYpos = newYpos;
            } else {
                setFieldFromBlock(blockType, blockXpos, blockYpos, blockRotate);

                blockType = -1;
            }

            updateYposCount = 50;
        }

        // 1ライン全て埋まっているかチェック
        let eraseLines = testFieldLine();
        if (eraseLines != 0) {
            // 埋まっているラインを消去
            eraseFieldLine(eraseLines);
            eraseLineWait = 10;
        }
    } else {
        if (--eraseLineWait <= 0) {
            packField();
            eraseLineWait = 0;
        }
    }

    updateLed();
}

function gameOver() {
    basic.showString("GAME OVER");
    gameState = STATE_TITLE;
}

// Field の隙間を詰める
function packField() {
    let ylimit = 0;
    for (let ypos = 4; ypos > ylimit;) {
        if (isEmptyFieldLine(ypos)) {
            for (let ypos2 = ypos; ypos2 > ylimit; ypos2--) {
                for (let xpos = 0; xpos < 5; xpos++) {
                    field[ypos2][xpos] = field[ypos2 - 1][xpos];
                }
            }
            eraseFieldLine(1 << (4 - ylimit));
            ylimit++;
        } else {
            ypos--;
        }
    }
}

// 指定ラインの Field を消去
function eraseFieldLine(lines: number) {
    for (let ypos = 0; ypos < 5; ypos++) {
        if (lines & (1 << (4 - ypos))) {
            for (let xpos = 0; xpos < 5; xpos++) {
                field[ypos][xpos] = 0;
            }
        }
    }
}

// Field の指定Y座標が1ライン分全て空白か否かを返す
function isEmptyFieldLine(ypos: number) {
    for (let xpos = 0; xpos < 5; xpos++) {
        if (field[ypos][xpos] != 0) {
            return 0;
        }
    }
    return 1;
}

// フィールドの各ラインが1ライン全て埋まっているかチェック
function testFieldLine() {
    let ret = 0;
    for (let ypos = 0; ypos < 5; ypos++) {
        let pixels = field[ypos];
        let count = 0;
        for (let pixel of pixels) {
            if (pixel == 0) {
                break;
            }
            count++;
        }
        if (count == 5) {
            // 1ライン全て埋まった
            ret |= (1 << (4 - ypos));
        }
    }

    return ret;
}

// Block が画面端もしくは Field に接触していないかチェック
function testBlock(btype: number, bxpos: number, bypos: number, brot: number) {
    let block = blockTable[btype][brot];
    for (let yofs = 0; yofs < block.length; yofs++) {
        if (bypos + yofs >= 0) {
            for (let xofs = 0; xofs < block[yofs].length; xofs++) {
                if (block[yofs][xofs] != 0) {
                    if (bypos + yofs > 4) {
                        // 下端に接触
                        return -1;
                    }

                    if (bxpos + xofs < 0 || bxpos + xofs > 4) {
                        // 左右端に接触
                        return -1;
                    }

                    if (field[bypos + yofs][bxpos + xofs] != 0) {
                        // フィールドに接触
                        return 1;
                    }
                }
            }
        }
    }

    return 0;
}

// Block を Field に反映
function setFieldFromBlock(btype: number, bxpos: number, bypos: number, brot: number) {
    let ypos = bypos;
    for (let blocks of blockTable[btype][brot]) {
        if (ypos >= 0 && ypos < 5) {
            let xpos = bxpos
            for (let block of blocks) {
                if (xpos >= 0 && xpos < 5) {
                    if (block == 1) {
                        field[ypos][xpos] = 1;
                    }
                }
                xpos++;
            }
        }

        ypos++;
    }
}

// LED更新
function updateLed() {
    let leds = [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
    ];

    setLedFromField(leds);
    if (blockType >= 0) {
        setLedFromBlock(leds, blockType, blockXpos, blockYpos, blockRotate);
    }
    showLed(leds);
}

// Field を LED に反映
function setLedFromField(leds: Array<Array<number>>) {
    let ypos = 0;
    for (let pixels of field) {
        let xpos = 0;
        for (let pixel of pixels) {
            leds[ypos][xpos] = pixel;
            xpos++;
        }
        ypos++;
    }
}

// Block を LEF に反映
function setLedFromBlock(leds: Array<Array<number>>, btype: number, bxpos: number, bypos: number, brot: number) {
    let ypos = bypos;
    for (let blocks of blockTable[btype][brot]) {
        if (ypos >= 0 && ypos < 5) {
            let xpos = bxpos
            for (let block of blocks) {
                if (xpos >= 0 && xpos < 5) {
                    if (block == 1) {
                        leds[ypos][xpos] = 1;
                    }
                }
                xpos++;
            }
        }

        ypos++;
    }
}

// LED 表示
function showLed(leds: Array<Array<number>>) {
    let ypos = 0;
    for (let line of leds) {
        let xpos = 0;
        for (let dot of line) {
            if (dot == 0) {
                led.unplot(xpos, ypos);
            } else {
                led.plot(xpos, ypos);
            }
            xpos++;
        }
        ypos++;
    }
}
