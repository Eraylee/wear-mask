import React, { useEffect, useState, useRef, useCallback } from "react";
import utils from "./utils";

const App = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [isModelReady, setIsModelReady] = useState(true);
  const [isPicReady, setPicReady] = useState(false);
  const [files, setFiles] = useState<FileList>();
  const [src, setSrc] = useState<string>();
  const init = async () => {
    const res = await utils.initModel();
    res && setIsModelReady(true);
    utils.initCanvas(canvas.current as HTMLCanvasElement);
  };
  useEffect(() => {
    init();
  }, []);
  const _getDetection = useCallback(async () => {
    if (files) {
      setPicReady(false);
      const res = await utils.run(image.current as HTMLImageElement);
      if (res) {
        setPicReady(true);
      } else {
        alert("此图片暂时无法解析，请手动调整");
      }
    }
  }, [files]);

  useEffect(() => {
    if (files && files.length) {
      _getDetection();
      setSrc(URL.createObjectURL(files[0]));
    }
  }, [_getDetection, files]);
  if (!isModelReady) {
    return <div className="loading">正在初始化模型</div>;
  }

  return (
    <div className="root">
      <h1>为了增强识别率，请上传清晰的人脸头像</h1>
      <h3>本站作者: <a href="http://www.eraylee.com" target='view_window'> ERAYLEE</a> </h3>
      <div className="content">
        <img src={src} ref={image} alt="" />
        <canvas className="canvas" id="canvas" ref={canvas}></canvas>
      </div>
      <div className="action">
        <label htmlFor="uploader">
          <div className="button">上传图片</div>
        </label>
        <input
          className="uploader"
          accept="image/*"
          type="file"
          id="uploader"
          onChange={e => setFiles(e.target.files as FileList)}
        />
        <button
          className="button"
          disabled={!isPicReady}
          onClick={utils.download}
        >
          下载头像
        </button>
      </div>
    </div>
  );
};

export default App;
