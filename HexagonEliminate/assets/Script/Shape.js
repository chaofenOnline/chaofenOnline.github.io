import Board from 'Board';
import {Tiles} from 'Config';

const getRandomInt = function (min, max) {
    let ratio = Math.random();
    return min + Math.floor((max - min) * ratio);
};
cc.Class({
    extends: cc.Component,

    properties: {
        tileH: 122, // 方块六边形高度
        tileScale: 0.7, // 方块默认缩放值，用于点击后放大效果
        board: {
            // 获取棋盘节点访问
            default: null,
            type: Board
        },
        // 以下为各方块类型图片
        type1: {
            default: null,
            type: cc.SpriteFrame
        },
        type2: {
            default: null,
            type: cc.SpriteFrame
        },
        type3: {
            default: null,
            type: cc.SpriteFrame
        },
        type4: {
            default: null,
            type: cc.SpriteFrame
        },
        type5: {
            default: null,
            type: cc.SpriteFrame
        },
        type6: {
            default: null,
            type: cc.SpriteFrame
        }
    },

    // LIFE-CYCLE CALLBACKS:

    onLoad() {
        this.setTile();
        this.addTouchEvent();
    },
    setTile() {
        this.tiles = Tiles;

        const hexData = this.random();

        let hexPx = hexData.list.map(hexArr => {
            return this.hex2pixel(hexArr, this.tileH);
        });

        //this.node.x = 0;
        //this.node.y = 0;
        this.setSpriteFrame(hexPx, this[`type${hexData.type}`]);
        this.node.ox = this.node.x;
        this.node.oy = this.node.y;
        this.node.scale = this.tileScale;

    },
    random() {
        //debugger
        this._shape = getRandomInt(0, this.tiles.length);
        const shape = this.tiles[this._shape];
        this._list = getRandomInt(0, shape.list.length)
        const list = shape.list[this._list];

        return {
            type: shape.type,
            list: list
        };
    },
    hex2pixel(hexArr, h) {
        let size = h / 2;
        let x = size * Math.sqrt(3) * (hexArr[0] + hexArr[1] / 2);
        let y = ((size * 3) / 2) * hexArr[1];
        return cc.v2(x, y);
    },
    setSpriteFrame(hexes, tilePic) {
        for (let index = 0; index < hexes.length; index++) {
            let node = new cc.Node('frame');
       
            node.x = hexes[index].x;
            node.y = hexes[index].y;
            
            let sprite = node.addComponent(cc.Sprite);
            sprite.spriteFrame = tilePic;
            
            node.parent = this.node;
            let w_pos = node.convertToWorldSpaceAR(cc.v2(0,0));
            node.w_pos = w_pos;
            // 显示当前子节点空间坐标
            //let n = new cc.Node('w_pos');
            //n.scale = 0.8;
            //n.color = cc.Color.BLACK;
            //n.addComponent(cc.Label).string = node.w_pos.x.toFixed()+ '\n\r' + node.w_pos.y.toFixed();
            //n.parent = node;
            node.scale = 0.7;
        }
    },
    addTouchEvent() {
        this.node.on('touchstart', event => {
            if(this.board.isDeleting)return;
            this.node.y += 50;
            this.node.scale = 0.8;
            this.node.children.forEach(child => {
                child.scale = 0.6;
            });
            this.boardTiles = [];
            this.fillTiles = [];
        });
        this.node.on('touchmove', event => {
            if(this.board.isDeleting)return;

            const {x, y} = event.touch.getDelta();

            this.node.x += x;
            this.node.y += y;
            // 方块与棋盘的触碰检测，并返回重合的部分。
            this.checkCollision(event);

            if (this.checkCanDrop()) {
                this.dropPrompt(true);
            } else {
                this.dropPrompt(false);
            }
        });
        this.node.on('touchend', () => {
            if(this.board.isDeleting)return;

            this.tileDrop();
        });
        this.node.on('touchcancel', () => {
            if(this.board.isDeleting)return;

            this.tileDrop();
        });
    },
    tileDrop() {

        this.resetBoardFrames();
        if (this.checkCanDrop()) {
            // 棋盘对应格子
            const boardTiles = this.boardTiles;
            // 当前选择积块
            const fillTiles = this.fillTiles;
            //this.fillTiles.forEach(e=>{e.scale = 3})
            const fillTilesLength = fillTiles.length;

            for (let i = 0; i < fillTilesLength; i++) {
                const boardTile = boardTiles[i];
                const fillTile = fillTiles[i];
                const fillNode = boardTile.getChildByName('fillNode');
                const spriteFrame = fillTile.getComponent(cc.Sprite).spriteFrame;

                // 棋盘存在方块的标识设置
                boardTile.isFulled = true;
                fillNode.getComponent(cc.Sprite).spriteFrame = spriteFrame;
                fillNode.scale = 0.8;
                fillNode.runAction(cc.scaleTo(0.2,1))
            
            }
            // 落子成功后重置方块
            this.resetTile();
            // 触发落入成功的事件
            this.board.dropSuccess(boardTiles[boardTiles.length-1])
        } else {
            this.backSourcePos();
        }

        // 棋盘得分动画播放完毕后会调用checklose方法 动画期间不改变状态 如果需要立即刷新 此处注释移除即可
        // this.board.checkLose();
    },
    // 根据空间坐标找到对应的棋盘位置
    wposGetNode({x,y}){
        return this.board.boardFrameList.filter(e=>{
            return !e.isFulled && Math.abs(e.w_pos.x - x) <= 3 && Math.abs(e.w_pos.y - y) <= 3 
        })[0];
    },
    checkLose() {

        let canDropCount = 0;
        const tiles = this.node.children;

        const tilesLength = tiles.length;
        const boardFrameList = this.board.boardFrameList;
        const boardFrameListLength = boardFrameList.length;

        // 存储当前子节点世界坐标
        let arr = []
        tiles.forEach(e=>arr.push(e.w_pos))
        // 存储第一个子节点与后续子节点的空间坐标差
        let subArr = []
        arr.forEach((e,i)=>{
            if(arr[i+1]){
                subArr.push(arr[i+1].sub(arr[0]))
            }
        })

        let lose = true;
        for (let i = 0; i < boardFrameListLength; i++) {
            const boardNode = boardFrameList[i];
    
            if (!boardNode.isFulled) {
                let nodeArr = [];
                // 根据子节点空间坐标差 挨个找出对应位置的棋盘节点
                for(let z = 0,len=subArr.length;z<len;z++){
                    let _wpos = boardNode.w_pos.add(subArr[z])
                    nodeArr.push(this.wposGetNode(_wpos));
                }
                // 如果对应棋盘节点都可放置 则还能玩
                let _get = nodeArr.length === 0 ? true : nodeArr.every(e=>!!e);
                if(_get){
                    console.log(this.node.name,"还能玩")
                    lose = false;
                    break;
                }
            
            }
        }
        return lose;
    },
    resetTile() {
        this.node.removeAllChildren();
        this.node.x = this.node.ox;
        this.node.y = this.node.oy;
        this.node.scale = 1;        
        this.setTile();
    },
    backSourcePos() {
        this.node.scale = this.tileScale;
        this.node.x = this.node.ox;
        this.node.y = this.node.oy;
        this.node.children.forEach(child => {
            child.scale = 0.7;
        });
    },
    checkCollision(event) {
        const tiles = this.node.children;
        this.boardTiles = []; // 保存棋盘与方块重合部分。
        this.fillTiles = []; // 保存方块当前重合的部分。
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            const pos = this.node.position.add(tile.position);
            const boardTile = this.checkDistance(pos);
            if (boardTile) {
                this.fillTiles.push(tile);
                this.boardTiles.push(boardTile);
            }
        }
    },
    checkDistance(pos) {
        const distance = 35;
        const boardFrameList = this.board.boardFrameList;
        for (let i = 0; i < boardFrameList.length; i++) {
            const frameNode = boardFrameList[i];
            const nodeDistance = frameNode.position.sub(pos).mag();
            if (nodeDistance <= distance) {
                return frameNode;
            }
        }
    },
    checkCanDrop() {
        const boardTiles = this.boardTiles; // 当前棋盘与方块重合部分。
        const fillTiles = this.node.children; // 当前拖拽的方块总数。
        const boardTilesLength = boardTiles.length;
        const fillTilesLength = fillTiles.length;

        // 如果当前棋盘与方块重合部分为零以及与方块数目不一致，则判定为不能落子。
        if (boardTilesLength === 0 || boardTilesLength != fillTilesLength) {
            return false;
        }

        // 如果方块内以及存在方块，则判定为不能落子。
        for (let i = 0; i < boardTilesLength; i++) {
            if (this.boardTiles[i].isFulled) {
                return false;
            }
        }

        return true;
    },
    resetBoardFrames() {
        const boardFrameList = this.board.boardFrameList;

        for (let i = 0; i < boardFrameList.length; i++) {
            const shadowNode = boardFrameList[i].getChildByName('shadowNode');
            shadowNode.opacity = 0;
        }
    },
    dropPrompt(canDrop) {
        const boardTiles = this.boardTiles;
        const boardTilesLength = boardTiles.length;
        const fillTiles = this.fillTiles;

        this.resetBoardFrames();
        if (canDrop) {
            for (let i = 0; i < boardTilesLength; i++) {
                const shadowNode = boardTiles[i].getChildByName('shadowNode');
                shadowNode.opacity = 100;
                const spriteFrame = fillTiles[i].getComponent(cc.Sprite).spriteFrame;
                shadowNode.getComponent(cc.Sprite).spriteFrame = spriteFrame;
            }
        }
    },
    start() {
    }

    // update (dt) {},
});
