/*
 * @Author: ERAYLEE
 * @Date: 2020-02-12 10:45:17
 * @LastEditors: ERAYLEE
 * @LastEditTime: 2020-02-24 21:31:18
 */
import * as faceapi from "face-api.js";
import { FaceDetection, WithFaceLandmarks, FaceLandmarks68 } from "face-api.js";
import mask from "./1.png";
import { fabric } from "fabric";

interface Point {
  x: number;
  y: number;
}

type DetectWidthFaceLandmarks = WithFaceLandmarks<
  {
    detection: FaceDetection;
  },
  FaceLandmarks68
>;

class Utils {
  private canvas?: fabric.Canvas;
  initModel = async () => {
    try {
      console.log("载入模型...");
      await Promise.all([
        // faceapi.nets.ssdMobilenetv1.load("/models"),
        faceapi.nets.tinyFaceDetector.load("/models"),
        faceapi.nets.faceLandmark68TinyNet.load("/models")
      ]);
      console.log("载入模型成功...");
      return true;
    } catch (error) {
      console.error(error);
    }
  };
  /**
   * 初始化canvas
   */
  initCanvas = (canvas: HTMLCanvasElement) => {
    this.canvas = new fabric.Canvas(canvas);
  };
  /**
   * 开始执行
   */
  run = async (imgInput: HTMLImageElement) => {
    this.canvas?.clear();
    const detection = await faceapi
      .detectSingleFace(imgInput, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true);
    const displaySize = {
      width: imgInput.width,
      height: imgInput.height
    };
    this.canvas?.setWidth(displaySize.width);
    this.canvas?.setHeight(displaySize.height);

    if (!detection) {
      await this.draw({
        top: 20,
        left: 20,
        width: 100,
        angle: 0
      });
      return false;
    }
    /**
     * 缩放比例
     */
    const scale = imgInput.width / imgInput.naturalWidth;

    const resized = faceapi.resizeResults(detection, displaySize);
    const options = this.getOpitions(resized);
    const img = await new fabric.Image(imgInput, {
      scaleX: scale,
      scaleY: scale,
      hasControls: false,
      hasBorders: false,
      evented: false,
      selectable: false
    });
    this.canvas?.add(img);
    await this.draw(options);
    return true;
  };
  /**
   * 获取参数
   * @param detection
   */
  getOpitions = (detection: DetectWidthFaceLandmarks) => {
    // 下巴轮廓
    const jawOutLine = detection.landmarks.getJawOutline();
    // 鼻子
    const nose = detection.landmarks.getNose();
    // 鼻子顶部
    const noseTop = nose[0];
    // 左脸
    const jawLeft = jawOutLine[1];
    // 右脸
    const jawRight = jawOutLine[15];
    // 左脸右脸之间中心点位置
    const midPoint = this.getMidPoint(jawRight, jawLeft);
    // 下巴底部
    const jawButtom = jawOutLine[8];
    // 口罩宽度
    const width = this.getDistance(jawRight, jawLeft);
    // 口罩高度
    const height = this.getDistance(midPoint, jawButtom);
    // 偏转弧度
    const angle = this.getFaceAngle(jawButtom, noseTop);
    return {
      left: jawLeft.x,
      top: jawLeft.y,
      width,
      height,
      angle
    };
  };
  /**
   * 获取两点之间距离
   * @param start
   * @param end
   */
  getDistance = (start: Point, end: Point) =>
    Math.sqrt(Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2));
  /***
   * 获取两点组成线段的中心坐标
   *    * @param start
   * @param end
   */
  getMidPoint = (start: Point, end: Point) => ({
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  });
  /**
   * 获取线段弧度
   * @param start
   * @param end
   */
  getFaceAngle = (start: Point, end: Point) =>
    (Math.PI / 2 + Math.atan2(end.y - start.y, end.x - start.x)) /
    (Math.PI / 180);
  /**
   * 开始绘画
   * @param canvas
   * @param options
   */
  draw = async ({ top, left, width, height, angle }: fabric.IImageOptions) => {
    const src = await faceapi.fetchImage(mask);
    const scaleX = (width as number) / src.naturalWidth;
    const scaleY = (height as number) / src.naturalHeight;
    const img = await new fabric.Image(src, {
      top,
      left,
      scaleX,
      scaleY,
      angle
    });
    this.canvas?.add(img);
  };
  /**
   * 下载文件
   * @param href
   */
  download = () => {
    const href = this.canvas?.toDataURL() as string;
    const aLink = document.createElement("a");
    aLink.href = href;
    aLink.download = "avatar.png";
    aLink.style.display = "none";
    // 触发点击
    document.body.appendChild(aLink);
    aLink.click();
    // 然后移除aLink
    document.body.removeChild(aLink);
  };
}

export default new Utils();
