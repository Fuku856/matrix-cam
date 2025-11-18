// マトリックス風文字セット（半角カタカナ、英語、数字）
const matrixChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz譁�ｭ怜喧縺繝昴繝繝遺促隕也阜縺ｮ蜈諤匁悶縺弱蜉ｩ縺代※縺上蜷梧悄逕溘0123456789';

let video = null;
let canvas = null;
let ctx = null;
let stream = null;
let animationId = null;
let charSize = 8; // 文字のサイズ（ピクセル）

// DOM要素の取得（DOMContentLoaded後に実行）
let startBtn, stopBtn, videoElement, canvasElement;

// DOMが読み込まれた後に初期化
document.addEventListener('DOMContentLoaded', () => {
    startBtn = document.getElementById('startBtn');
    stopBtn = document.getElementById('stopBtn');
    videoElement = document.getElementById('video');
    canvasElement = document.getElementById('matrixCanvas');
    
    // Canvasの初期サイズを設定（最小サイズ）
    if (canvasElement) {
        canvasElement.width = 640;
        canvasElement.height = 480;
    }
    
    // イベントリスナー
    if (startBtn) startBtn.addEventListener('click', startCamera);
    if (stopBtn) stopBtn.addEventListener('click', stopCamera);
});

// ページを離れる際にカメラを停止
window.addEventListener('beforeunload', stopCamera);

// カメラ起動
async function startCamera() {
    try {
        // カメラストリームを取得
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user', // フロントカメラ（インカメ）
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });

        video = videoElement;
        canvas = canvasElement;
        ctx = canvas.getContext('2d');

        // Canvasサイズをビデオサイズに合わせる関数
        const setupCanvas = () => {
            // ビデオのサイズが有効かチェック
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // レスポンシブ対応：画面幅に合わせて調整
                const maxWidth = window.innerWidth - 40;
                if (canvas.width > maxWidth) {
                    const ratio = maxWidth / canvas.width;
                    canvas.style.width = maxWidth + 'px';
                    canvas.style.height = (canvas.height * ratio) + 'px';
                } else {
                    canvas.style.width = canvas.width + 'px';
                    canvas.style.height = canvas.height + 'px';
                }
                
                // 文字サイズを動的に調整（解像度に応じて）
                charSize = Math.max(6, Math.floor(canvas.width / 80));
                
                console.log('Canvasサイズ:', canvas.width, 'x', canvas.height);
                console.log('文字サイズ:', charSize);
                
                startRendering();
            } else {
                // サイズがまだ取得できない場合、少し待って再試行
                setTimeout(setupCanvas, 100);
            }
        };

        // ビデオ要素にストリームを設定
        video.srcObject = stream;
        
        // メタデータが読み込まれたらCanvasをセットアップ
        video.addEventListener('loadedmetadata', setupCanvas, { once: true });
        
        // ビデオを再生
        await video.play();
        
        // 念のため、少し待ってからもセットアップを試みる
        setTimeout(setupCanvas, 200);

        startBtn.disabled = true;
        stopBtn.disabled = false;
    } catch (error) {
        console.error('カメラへのアクセスに失敗しました:', error);
        alert('カメラへのアクセスに失敗しました。ブラウザの設定を確認してください。\nエラー: ' + error.message);
    }
}

// カメラ停止
function stopCamera() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    if (video) {
        video.srcObject = null;
    }

    if (ctx && canvas) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
}

// 明度から文字を選択
function getCharFromBrightness(brightness) {
    const index = Math.floor((brightness / 255) * (matrixChars.length - 1));
    return matrixChars[index];
}

// マトリックス風エフェクトで描画
function renderMatrix() {
    if (!video || !ctx || !canvas) return;
    
    // ビデオのサイズが有効かチェック
    if (video.videoWidth === 0 || video.videoHeight === 0 || 
        canvas.width === 0 || canvas.height === 0) {
        // サイズが無効な場合、少し待って再試行
        animationId = requestAnimationFrame(renderMatrix);
        return;
    }

    // ビデオフレームを一時的なCanvasに描画
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // ビデオを一時Canvasに描画
    try {
        tempCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } catch (e) {
        // 描画エラーの場合、次のフレームを待つ
        animationId = requestAnimationFrame(renderMatrix);
        return;
    }
    
    // 画像データを取得
    const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Canvasをクリア
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 文字を描画
    ctx.font = `${charSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // ピクセルをサンプリングして文字に変換
    const step = charSize; // 文字サイズ分の間隔でサンプリング
    
    for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
            const index = (y * canvas.width + x) * 4;
            
            // インデックスが範囲内かチェック
            if (index + 2 >= data.length) continue;
            
            // RGB値を取得
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            
            // 明度を計算（グレースケール変換）
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
            
            // 明度に応じて文字を選択
            const char = getCharFromBrightness(brightness);
            
            // 明度に応じて透明度を調整（より明るい部分を強調）
            const alpha = Math.min(1, brightness / 200);
            const greenIntensity = Math.min(255, brightness + 50);
            
            // ネオングリーンの色を設定（明度に応じて強度を変える）
            ctx.fillStyle = `rgba(0, ${Math.floor(greenIntensity)}, ${Math.floor(greenIntensity * 0.25)}, ${alpha})`;
            
            // 文字を描画
            ctx.fillText(char, x + step / 2, y + step / 2);
        }
    }

    // 次のフレームを描画
    animationId = requestAnimationFrame(renderMatrix);
}

// レンダリング開始
function startRendering() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    renderMatrix();
}
