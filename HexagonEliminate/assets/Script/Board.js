import {DelRules} from 'Config';
import _ from './util/Util';

let theScore = 0;
cc.Class({
    extends: cc.Component,

    properties: {
        hexSide: 5, // 需要生成的六边形布局的边界个数
        tileH: 110, // 六边形高度
        tilePic: {
            // 棋盘背景
            default: null,
            type: cc.SpriteFrame
        },
        dropScore:20,
    },

    onLoad() {
        this.status = 1;

        this.setHexagonGrid();
        
        //console.log(this.node.children[0].width,this.node.children[0].height)
        this.getOldScore();
    },
    // Methods
    getOldScore() {
        const oldScore = cc.sys.localStorage.getItem('score');
        let node = cc.find('Canvas/OldScore');
        let label = node.getComponent(cc.Label);
        label.string = Number(oldScore);
    },
    dropSuccess(node) {
        this.deleteAnimInitNode = null;
        this.deleteAnimCount = 0;
        this.deleteNodeArr = [];
        let fulledTilesIndex = []; // 存储棋盘内有方块的的索引
        let readyDelTiles = []; // 存储待消除方块
        const boardFrameList = this.boardFrameList;
        this.isDeleting = true; // 方块正在消除的标识，用于后期添加动画时，充当异步状态锁
        this.addDropScore(node);

        // 首先获取棋盘内存在方块的格子信息
        for (let i = 0; i < boardFrameList.length; i++) {
            const boardFrame = boardFrameList[i];
            if (boardFrame.isFulled) {
                fulledTilesIndex.push(i);
            }
        }

        for (let i = 0; i < DelRules.length; i++) {
            const delRule = DelRules[i]; // 消除规则获取
            // 逐一获取规则数组与存在方块格子数组的交集
            let intersectArr = _.arrIntersect(fulledTilesIndex, delRule);
            if (intersectArr.length > 0) {
                // 判断两数组是否相同，相同则将方块添加到待消除数组里
                const isReadyDel = _.checkArrIsEqual(delRule, intersectArr);
                if (isReadyDel) {
                    readyDelTiles.push(delRule);
                }
            }
        }

        // 开始消除
        //console.log(readyDelTiles.length+'消，',readyDelTiles);
        // 升序排列
        readyDelTiles.sort();
        this.deleteQ = 0;
        this.deleteR = 0;
        for (let i = 0; i < readyDelTiles.length; i++) {
            const readyDelTile = readyDelTiles[i];
            this.deleteNodeArr[i] = [];
            for (let j = 0; j < readyDelTile.length; j++) {
                const delTileIndex = readyDelTile[j];
                const boardFrame = this.boardFrameList[delTileIndex];
                boardFrame.isFulled = false;
                this.deleteNodeArr[i].push(boardFrame);
                // 消除时分数出现的位置节点
                if(i ===0 && j === 2){
                    this.deleteAnimInitNode = boardFrame;
                }
            }
        }


        // 可进行消除
        if(readyDelTiles.length){
            // 计算分数
            this.scoreRule(readyDelTiles);
            // 执行消除动画
            this.deleteAnim();
        }

        this.isDeleting = false;
    },

    // 放置加分
    addDropScore(node){
        this.scoreAnim(node,this.dropScore)
    },
    // 消除动画
    deleteAnim(){
        if(this.deleteNodeArr[this.deleteAnimCount]){
            let max = this.deleteNodeArr[this.deleteAnimCount].length;
            let score = this.dropScore;
            for(let i = 0;i<this.deleteAnimCount+1;i++){
                score += this.deleteScoreArr[i]
            }
            this.scoreAnim(null,score,this.deleteNodeArr.length-1 !== this.deleteAnimCount);
            this.deleteNodeArr[this.deleteAnimCount].forEach((e,i)=>{
                this.nodeDelete(e,i,max)
            });


        }
    },

    // 得分特效
    scoreAnim(node,score,noMove){
        let w_pos = (node || this.deleteAnimInitNode).convertToWorldSpaceAR(cc.v2(0,0));
        let dropScore = cc.find("Canvas/dropScore");
        let pos = dropScore.parent.convertToNodeSpaceAR(w_pos);
        dropScore.setPosition(pos);
        dropScore.scale = 1.5;
        dropScore.getComponent(cc.Label).string = score;
        dropScore.runAction(cc.sequence(
            cc.scaleTo(0.3,2.5).easing(cc.easeBackOut()),
            cc.scaleTo(0.1,2),
            cc.callFunc(e=>{
               // console.log('noMove:',noMove)
                if(noMove === true){
                    return
                }
                e.runAction(cc.spawn(
                    cc.moveBy(0.3,0,100),
                    cc.scaleTo(0.3,0),
                    cc.callFunc(e=>{
                        theScore += score;
                        cc.find("Canvas/Score").getComponent(cc.Label).string = theScore;
                        this.checkLose()
                    })
                ))
            })
        ));

    },

    // 单个六边形消除动画
    nodeDelete(boardFrame,i,max){
        const delNode = boardFrame.getChildByName('fillNode');
        const finished = cc.callFunc(() => {
            delNode.getComponent(cc.Sprite).spriteFrame = null;
            delNode.opacity = 255;
            if(i === max -1){
                this.deleteAnimCount ++;
                this.deleteAnim();
            }
        }, this);
        delNode.runAction(cc.sequence(cc.fadeOut(0.5), finished));
    },

    // 分数规则
    scoreRule(deleteArr) {
        /**
         * 放置积块得分：20分/个
         1消得分：20一格，显示积块得分+消除行或列的总得分
         2消得分：30一格，显示积块得分+较短行消除行或列的总得分再显示加上较长行或列的消除得分之和
         3消得分：前两行或列40一格，第三行或列91一格，顺序由短及长。显示逻辑同上，即一次显示积块得分+较短行或列的消除得分之和；二次显示一次分值+次行或列的消除得分之和；三次显示二次得分值+较长行或列的消除得分之和。
         4消得分：前两行或列50一格，第三行或列100一格，第四行或列163一格。显示逻辑同上。
         5消得分：前两行或列60一格，第三行或列137一格，第四行或列224一格，第五行或列316一格。显示逻辑同上。
         6消得分：前两行或列70一格，第三行或列152一格，第四行或列290一格，第五行或列520一格，第六行730一格。显示逻辑同上。
         7消得分：前两行或列80一格，第三行或列177一格，第四行或列363一格，第五行或列607一格，第六行963，第七行1300。显示逻辑同上。
         8消得分：前两行或列90一格，第三行或列200一格，第四行或列480一格，第五行或列782一格，第六行1300一格，第七行2008一格，第八行。显示逻辑同上。

         金币在消除方块COMBO时掉落，2消=1个，3消=2个，4消=3个，5消=6个，6消=7个，7消=9个,8消=10个；每个金币+10分。
         */

        this.deleteScoreArr = [];
        // 放置得分
        let score = 0;
        // 消除得分
        if(deleteArr && deleteArr.length){
            switch (deleteArr.length){
                case 1:
                    this.deleteScoreArr[0] = deleteArr[0].length * 20;
                    score += deleteArr[0].length * 20;
                    break;
                case 2:
                    var n = 0;
                    deleteArr.forEach((e,i)=>{
                        this.deleteScoreArr[i] = e.length * 30;
                        n+=e.length
                    });
                    score += n * 30;
                    break;
                case 3:
                    var n = 0;
                    deleteArr.forEach((e,i)=>{
                        this.deleteScoreArr[i] = e.length * 30;
                        n+=e.length
                    });
                    score += n * 30;
                    break;
            }
            console.log("this.deleteScoreArr:",this.deleteScoreArr)
        }

        return score;

    },
    checkLose() {
        //if (this.isDeleting) return;

        const fillTiles = this.node.parent.getChildByName('TileContainer').children;
        const fillTilesLength = fillTiles.length;
        let count = 0;

        for (let i = 0; i < fillTilesLength; i++) {
            const fillTile = fillTiles[i];
            const fillTileScript = fillTile.getComponent('Shape'); // 直接获取方块节点下的脚本组件
            // 当前方块不可放置于棋盘上  设置半透明

            if (fillTileScript.checkLose()) {
                count++;
                fillTile.opacity = 125;
                console.log(fillTile.name,'无法摆放')
            } else {
                fillTile.opacity = 255;
            }
        }

        // 3个方块都不可放置于棋盘上 则为失败
        if (count === fillTilesLength) {
            const oldScore = cc.sys.localStorage.getItem('score');
            if (oldScore < theScore) {
                cc.sys.localStorage.setItem('score', theScore);
            }
            this.gameOver();
        }
    },
    gameOver() {
        if(!this.status)return;
        console.log("输了")
        const Failed = cc.find('Canvas/Failed');
        Failed.active = true;
        Failed.runAction(cc.fadeIn(0.3));
        this.status = 0;
        return
    },
    setHexagonGrid() {
        this.hexes = [];
        this._hexes = [];
        this.boardFrameList = [];
        this.hexSide--;
        // 棋盘六角网格布局，坐标系存储方法
        for (let q = -this.hexSide; q <= this.hexSide; q++) {
            let r1 = Math.max(-this.hexSide, -q - this.hexSide);
            let r2 = Math.min(this.hexSide, -q + this.hexSide);
            for (let r = r1; r <= r2; r++) {
                let col = q + this.hexSide;
                let row = r - r1;
                if (!this.hexes[col]) {
                    this.hexes[col] = [];
                }
                if (!this._hexes[col]) {
                    this._hexes[col] = [];
                }
                this.hexes[col][row] = this.hex2pixel({q, r}, this.tileH);
                this._hexes[col][row] = {q,r};
            }
        }
        //console.log(this.hexes,this._hexes)
        this.hexes.forEach((hexs,i) => {
            this.setSpriteFrame(hexs,i);
        });
    },
    hex2pixel(hex, h) {
        // 棋盘六角网格，坐标系转换像素方法
        let size = h / 2;
        let x = size * Math.sqrt(3) * (hex.q + hex.r / 2);
        let y = ((size * 3) / 2) * hex.r;
        return cc.v2(x, y);
    },
    setSpriteFrame(hexes,i) {
        for (let index = 0; index < hexes.length; index++) {
            let node = new cc.Node('frame');
            let sprite = node.addComponent(cc.Sprite);
            sprite.spriteFrame = this.tilePic;
            node.x = hexes[index].x;
            node.y = hexes[index].y;
            node.scale = 0.7;
            node.parent = this.node;
            hexes[index].spriteFrame = node;
            this.setShadowNode(node);
            this.setFillNode(node);
            this.setWpos(node,this._hexes[i][index]);
            // 保存当前棋盘格子的信息，用于后面落子判定及消除逻辑等。
            this.boardFrameList.push(node);
        }
    },
    setShadowNode(node) {
        const newNode = new cc.Node('shadowNode');
        newNode.addComponent(cc.Sprite);
        newNode.opacity = 150;
        newNode.parent = node;
    },
    setFillNode(node) {
        const newNode = new cc.Node('fillNode');
        newNode.addComponent(cc.Sprite);
        newNode.parent = node;
    },
    // 记录棋盘各棋子世界坐标
    setWpos(node,qr){
        let w_pos = node.convertToWorldSpaceAR(cc.v2(0,0));
        node.w_pos = w_pos

        // 显示行列即当前棋子世界坐标
        //const {q,r} = qr;
        //const newNode = new cc.Node("qr");
        //newNode.addComponent(cc.Label).string = `${q},${r}`;
        //newNode.y += 15;
        //newNode.scale = 0.8
        //let _node = new cc.Node("w_pos");
        //_node.y -= 25;
        //_node.scale = 0.6
        //_node.addComponent(cc.Label).string = `${w_pos.x.toFixed()},${w_pos.y.toFixed()}`;
        //_node.parent = node;
        //newNode.parent = node;

    },



    // update (dt) {},
});
