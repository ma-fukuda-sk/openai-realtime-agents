import { useRef } from "react";
import { convertWebMBlobToWav } from "../lib/audioUtils";

function useAudioDownload() {
  // MediaRecorderインスタンスを保存するRef
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // 録音されたBlobチャンクを収集するRef
  const recordedChunksRef = useRef<Blob[]>([]);

  /**
   * 提供されたリモートストリームとマイクオーディオを結合して録音を開始します。
   * @param remoteStream - リモートMediaStream（例：audio要素から）
   */
  const startRecording = async (remoteStream: MediaStream) => {
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("マイクストリームの取得エラー:", err);
      // マイクアクセスが失敗した場合は空のMediaStreamにフォールバック
      micStream = new MediaStream();
    }

    // ストリームをマージするためのAudioContextを作成
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    // リモートオーディオストリームを接続
    try {
      const remoteSource = audioContext.createMediaStreamSource(remoteStream);
      remoteSource.connect(destination);
    } catch (err) {
      console.error("リモートストリームのオーディオコンテキストへの接続エラー:", err);
    }

    // マイクオーディオストリームを接続
    try {
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);
    } catch (err) {
      console.error("マイクストリームのオーディオコンテキストへの接続エラー:", err);
    }

    const options = { mimeType: "audio/webm" };
    try {
      const mediaRecorder = new MediaRecorder(destination.stream, options);
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      // タイムスライスなしで録音を開始
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch (err) {
      console.error("結合ストリームでのMediaRecorder開始エラー:", err);
    }
  };

  /**
   * MediaRecorderがアクティブな場合に停止します。
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      // 停止前に最終データを要求
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  };

  /**
   * WebMからWAVに変換後、録音のダウンロードを開始します。
   * レコーダーがまだアクティブな場合、ダウンロード前に最新データを要求します。
   */
  const downloadRecording = async () => {
    // 録音がまだアクティブな場合、最新チャンクを要求
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      // 現在のデータを要求
      mediaRecorderRef.current.requestData();
      // ondataavailableが発火するまで短時間待機
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (recordedChunksRef.current.length === 0) {
      console.warn("ダウンロードする録音チャンクが見つかりません。");
      return;
    }
    
    // 録音チャンクを単一のWebM blobに結合
    const webmBlob = new Blob(recordedChunksRef.current, { type: "audio/webm" });

    try {
      // WebM blobをWAV blobに変換
      const wavBlob = await convertWebMBlobToWav(webmBlob);
      const url = URL.createObjectURL(wavBlob);

      // フォーマットされた日時文字列を生成（ファイル名で許可されない文字を置換）
      const now = new Date().toISOString().replace(/[:.]/g, "-");

      // 非表示のアンカー要素を作成してダウンロードをトリガー
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `realtime_agents_audio_${now}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 短時間後にblob URLをクリーンアップ
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error("録音のWAV変換エラー:", err);
    }
  };

  return { startRecording, stopRecording, downloadRecording };
}

export default useAudioDownload; 