let Alert=function(){};Alert.prototype.makeText=((e,c)=>{let l=cc.director.getScene().getComponentInChildren(cc.Canvas),o=(l=l.node).getChildByName("MessageAlert_0_0_1");o&&o.runAction(cc.sequence(cc.moveBy(.2,0,1e3),cc.callFunc(e=>{o.removeFromParent()})));let t=new cc.Node;t.color=cc.Color.WHITE;let n=t.addComponent(cc.Label),r=t.addComponent(cc.LabelOutline);r.color=cc.Color.BLACK,r.width=2,n.horizontalAlign=cc.Label.HorizontalAlign.CENTER,n.verticalAlign=cc.Label.VerticalAlign.CENTER,n.fontSize=30,n.string=e;let a=new cc.Node,i=a.addComponent(cc.Graphics);i.clear(),i.strokeColor=cc.Color.GRAY;let d=cc.Color.GRAY;d.a=200,i.fillColor=d;let C=e.length*n.fontSize,s=2*n.fontSize;i.roundRect(-C/2-25,-s/2,C+50,s,5),i.stroke(),i.fill();let m=new cc.Node;m.name="MessageAlert_0_0_1",m.addChild(a),m.addChild(t),m.scale=0,l.addChild(m);let A=cc.callFunc(e=>{m.removeFromParent()});m.runAction(cc.sequence(cc.scaleTo(.2,1).easing(cc.easeBounceInOut()),cc.delayTime(c),cc.moveBy(.2,0,1e3),A))}),Alert.show=((e,c=2)=>{return(new Alert).makeText(e,c)});