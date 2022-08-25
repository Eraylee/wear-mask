## 给你的头像戴上口罩
![image](https://github.com/Eraylee/wear-mask/blob/master/screenshot/20200222171719.png?raw=true?raw=true)
体验地址：[http://project.wear-mask.eraylee.com/](http://project.wear-mask.eraylee.com/)
## 前言
在家闲的无聊，想到之前看到有人写过自动添加圣诞帽的小程序，忽然间来了灵感，准备自己写一个戴口罩的小网页。
## 基本功能
上传图片，通过算法识别图片人脸位置；如果能够识别出人脸，将口罩覆盖到对应的位置，能够微调纠正口罩大小、位置、角度，如果不能识别，口罩自动生成，且需自行调整口罩。
## 如何识别人脸
首先想到了使用[Tensorflow.js](https://tensorflow.google.cn/js/tutorials)来进行人脸识别，获取人脸坐标点。引用官方介绍：
> TensorFlow.js 是一个用于使用 JavaScript 进行机器学习开发的库

当我看的Tensors(张量)、Operations(操作)、Models(模型) 、 Layers(层)等这一系列概念之后，内心是拒绝的，实现起来太过于麻烦。后来我发现了[face-api](https://github.com/justadudewhohacks/face-api.js)这个基于[Tensorflow.js](https://tensorflow.google.cn/js/tutorials) core进行封装的库。face-api实现了三种卷积神经网络（CNN）架构，用于完成人脸检测、识别和特征点检测任务。
face-api实现了一系列的卷积神经网络，这个网络会返回包围每张脸的人脸边框预测层，同时能够返回68个特征点来描述面部各个五官。
![](http://5b0988e595225.cdn.sohucs.com/images/20180717/08b204a102584e789eef926ecb55b101.jpeg)

## 初始化
### 下载安装
```bash
$ npm i face-api.js --save
```
### 导入模型
face-api.js 训练了一系列的模型，通过使用这些已经训练好的模型，我们可以快速实现我们想要的功能，所有模型我们可以在[这里](https://github.com/justadudewhohacks/face-api.js/tree/master/weights "这里")这里获取。我们首相需要将所需的模型放在`/public/models`文件夹下面，没有模型的话，face-api无法正常运行。
### 初始化模型
face-api为我们提供了三种主要用于人脸检测的模型。
Tiny Face Detector
> Tiny Face Detector是一款性能非常高的实时人脸检测器，与SSD Mobilenet V1人脸检测器相比，它更快，更小，资源消耗更少，作为回报，它在检测小脸时的表现稍差。这个型号极具移动性和网络友好性，因此它应该是移动设备和资源有限的客户端上的GO-TO人脸检测器。量化模型的大小仅为190 KB（tiny_face_detector_model）。

SSD Mobilenet V1
> 对于面部检测，该项目实现了基于MobileNetV1的SSD（单次多盒检测器）。神经网络将计算图像中每个面部的位置，并将返回边界框以及每个面部的概率。该面部检测器旨在获得检测面部边界框而不是低推理时间的高精度。量化模型的大小约为5.4 MB（ssd_mobilenetv1_model）。

MTCNN
> MTCNN（多任务级联卷积神经网络）代表了SSD Mobilenet v1和Tiny Yolo v2的替代面部检测器，它提供了更多的配置空间。通过调整输入参数，MTCNN应该能够检测各种面部边界框大小。MTCNN是一个3级级联CNN，它同时返回5个面部标志点以及每个面的边界框和分数。此外，型号尺寸仅为2MB。

考虑到性能问题，我们使用Tiny Face Detector来进行人脸检测（~~其实是使用SSD Mobilenet V1报错，目前还没解决~~）
```javascript
faceapi.nets.tinyFaceDetector.load("/models"),
```
## 识别
使用faceapi.detectAllFaces识别多个人脸，使用faceapi.detectSingleFace识别单个人脸，默认情况下使用`SSD Mobilenet V1`这个模型检测，若要指定`Tiny Face Detector`，传入一个`TinyFaceDetectorOptions`实例即可。
```javascript
const detection = await faceapi.detectSingleFace(imgInput) //SSD Mobilenet V1
const detection = await faceapi.detectSingleFace(imgInput, new faceapi.TinyFaceDetectorOptions()) //Tiny Face Detector
```
注意：此api是异步的，所以我使用了[await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await "await")将执行转成同步。
detectSingleFace识别完成之后，若检测到图片中有人脸，则会返回一个对象（没有识别到人脸会返回undefined）。我们打印一下这个对象里面有啥东西：
![](https://github.com/Eraylee/wear-mask/blob/master/screenshot/20200224150822.png?raw=true)

这个对象包含边界框、分值、图片大小等信息，如果需要获取脸部特征点的参数，需要链式调用`withFaceLandmarks`方法。
```javascript
const detection = await faceapi
    .detectSingleFace(imgInput, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true);
```
此时我们能够从返回对象中`landmarks`上的方法获取相应的特征点。
```javascript
const landmarkPositions = landmarks.positions     // 全部 68 个点
const jawOutline = landmarks.getJawOutline()      // 轮廓
const nose = landmarks.getNose()                  // 鼻子
const mouth = landmarks.getMouth()                // 嘴巴
const leftEye = landmarks.getLeftEye()            // 左眼
const rightEye = landmarks.getRightEye()          // 右眼
const leftEyeBbrow = landmarks.getLeftEyeBrow()   // 左眉
const rightEyeBrow = landmarks.getRightEyeBrow()  // 右眉
```
如果仔细观察一下这些点的位置，你会发现它们都是基于原始图像尺寸的，上传之后展示的尺寸可能跟原始尺寸有所出入，直接用这些点会不准确，所以我们得将这些点按照比例转化一下。好在face-api给我们提供了一个方法：
 ```javascript
const resized = faceapi.resizeResults(detection, displaySize);
```
此方法会返回按比例转换之后的数据。
我们可以通过drawFaceLandmarks这个方法把特征点直接渲染到canvas上面
```javascript
faceapi.draw.drawFaceLandmarks(canvas, resizedResults)
```
然后你会看的这种效果：
![](https://github.com/Eraylee/wear-mask/blob/master/screenshot/20200224154200.png?raw=true)

我们画一个图来分析一下口罩的大致位置：
![](https://github.com/Eraylee/wear-mask/blob/master/screenshot/20200224164643.png?raw=true)

由于`getJawOutline`获得到的点是从左到右的，我们取第2个点为口罩的起始点，取第二个点到第16个点的距离为口罩的宽度，我们封装一个方法来获取两点之间的距离：
```javascript
interface Point {
  x: number;
  y: number;
}
getDistance = (start: Point, end: Point) =>
	Math.sqrt(Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2));
```
我们选取点[1]到点[16]的中点（点从0开始计算）到下巴端点[]的距离为口罩高度。
```javascript
// 获取中心点 C((x1+x2)/2,(y1+y2)/2 )
getMidPoint = (start: Point, end: Point) => ({
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
 });
// 左脸右脸之间中心点位置
const midPoint =  getMidPoint(jawRight, jawLeft)
// 口罩高度
const height =  getDistance(  midPoint , jawButtom);
```
## 添加口罩
既然口罩的起始点坐标、宽、和高都已经确认了，我们可以根据这些参数画口罩。想象一下ps图层，将上传的原始图片放在底部图层，图片上面覆盖一层canvas标签，将生成的口罩放置到canvas对应的坐标即可（考虑到需要下载功能，在图片上传之后直接放置到canvas上面）。
![](https://github.com/Eraylee/wear-mask/blob/master/screenshot/20200224172727.png?raw=true)

考虑到需要调整口罩大小、位置，原生的canvas不太好完成事件处理，我们可以使用[fabric.js](http://fabricjs.com/ "fabricjs")来完成这些操作，此库天然支持canvas图片的编辑。

**安装[fabric.js](http://fabricjs.com/ "fabricjs")**
```bash
$ npm install fabric --save
```
创建一个fabric画布，有了fabric画布才能进行后面的操作。
```bash
const canvas = new fabric.Canvas(canvas);
```
图片不能直接放置到fabric画布上面，需要将图片转换成fabric Image对象：
```bash
const img = await new fabric.Image(imgInput);
```
`fabric.Image()`第二个参数接收一个配置对象
```javascript
{
	scaleX: scaleX,      // 在X轴的放缩比例
	scaleY: scaleY,      // 在y轴的放缩比例
	hasControls: false,  // 需要控制器
	hasBorders: false,   // 需要边框
	evented: false,      // 是否需要事件操作
	selectable: false    // 可否选择
}
```
将生成的fabric Image对象直接添加到fabric画布上面即可：
```javascript
canvas.add(img);
```
来看看成功了没~~
![](https://github.com/Eraylee/wear-mask/blob/master/screenshot/20200224204613.png?raw=true)

我们换一个稍微歪一点的脸试试：
![](https://github.com/Eraylee/wear-mask/blob/master/screenshot/20200225172958.png?raw=true)

发现问题了吗？我们没有考虑脸部倾斜的情况，人脸一歪，口罩的位置就不对了，我们肯定得把这个问题扼杀在摇篮中！
继续画辅助线来分析一下~
![](https://github.com/Eraylee/wear-mask/blob/master/screenshot/20200224210208.png?raw=true)

我们选取鼻子顶部端点与下巴底部端点连成`线l`，此`线l`与y轴的夹角等于人脸的偏转角度，我们用`角α`来表示这个角，那么这个角度怎么求呢？这个就涉及到三角函数了，高中知识忘了的赶紧去复习复习！
`Math.atan2`方法返回一个数值-π和π代表之间的角θ(x, y)。这是正X轴与点(X, Y)之间的逆时针角度，以弧度表示。我们可以根据`Math.atan2`这个api获取上图`角β`的弧度，我们需要乘`180 / Math.PI`来计算出角度（180度=PI弧度,所以1度 = PI/180），将其角度减去90度就能求得`角α`的角度。
![](https://media.prod.mdn.mozit.cloud/attachments/2015/09/22/11557/dd6fa5f4dd920f07b1e794c203bcc462/atan2.png?raw=true)

注意！Math.atan2返回的结果是逆时针的，而canvas里面的旋转是顺时针的！所以我们得将结果取反！取反之后简化一下就可以得出一下方法：
```javascript
getFaceAngle = (start: Point, end: Point) =>
	(Math.PI / 2 + Math.atan2(end.y - start.y, end.x - start.x)) *( 180 / Math.PI);
```
我们再试一下~
![](https://github.com/Eraylee/wear-mask/blob/master/screenshot/20200225122004.png?raw=true)

搞定，毫无违和感！
## 结尾
这是我第一次写技术性教程！可能有一些遗漏点或者错误，大家可以指出来。后面我会陆陆续续写一些教程来与大家一起学习！

**下载**
```bash
$ git clone https://github.com/Eraylee/wear-mask.git
$ npm install
```
**运行**
```bash
npm start
```