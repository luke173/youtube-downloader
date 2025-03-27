const express = require('express');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/get-qualities', async (req, res) => {
  const url = req.body.url;
  if (!url) {
    return res.status(400).json({ error: '請提供 YouTube 網址' });
  }

  try {
    const info = await youtubedl(url, { listFormats: true });
    const formats = info.split('\n')
      .filter(line => line.includes('video') && line.includes('mp4'))
      .map(line => {
        const match = line.match(/(\d+p)/);
        return match ? match[1] : null;
      })
      .filter(quality => quality)
      .sort((a, b) => parseInt(b) - parseInt(a));

    const uniqueQualities = [...new Set(formats)];
    res.json({ qualities: uniqueQualities });
  } catch (error) {
    console.log('獲取畫質失敗:', error);
    res.status(500).json({ error: '無法獲取畫質' });
  }
});

app.post('/download', async (req, res) => {
  const url = req.body.url;
  const format = req.body.format || 'mp4';
  const quality = req.body.quality || '720p';

  if (!url) {
    return res.send('請輸入 YouTube 網址！');
  }

  try {
    const videoInfo = await youtubedl(url, { getTitle: true });
    let videoTitle = videoInfo || 'downloaded_video';
    videoTitle = videoTitle.replace(/[^a-zA-Z0-9]/g, '_');

    const outputFile = path.join(__dirname, `video.${format}`);
    console.log(`開始下載: ${url}, 格式: ${format}, 畫質: ${format === 'mp4' ? quality : 'N/A'}, 輸出檔案: ${outputFile}`);

    const dlOptions = {
      output: outputFile,
      verbose: true,
    };

    if (format === 'mp4') {
      // 檢查可用畫質
      const info = await youtubedl(url, { listFormats: true });
      const availableQualities = info.split('\n')
        .filter(line => line.includes('video') && line.includes('mp4'))
        .map(line => {
          const match = line.match(/(\d+p)/);
          return match ? parseInt(match[1].replace('p', '')) : null;
        })
        .filter(q => q);

      const targetHeight = parseInt(quality.replace('p', ''));
      const maxAvailableHeight = Math.max(...availableQualities);
      let formatString;

      if (availableQualities.includes(targetHeight)) {
        formatString = `bestvideo[height<=${targetHeight}]+bestaudio/best[height<=${targetHeight}]`;
      } else if (targetHeight > maxAvailableHeight) {
        formatString = `bestvideo[height<=${maxAvailableHeight}]+bestaudio/best[height<=${maxAvailableHeight}]`;
      } else {
        // 如果目標畫質低於最低可用畫質，選擇最低畫質
        const minAvailableHeight = Math.min(...availableQualities);
        formatString = `bestvideo[height<=${minAvailableHeight}]+bestaudio/best[height<=${minAvailableHeight}]`;
      }

      dlOptions.format = formatString;
      dlOptions.mergeOutputFormat = 'mp4';
      // 確保有影片流
      dlOptions.addMetadata = true;
      dlOptions.embedThumbnail = true;
    } else if (format === 'mp3') {
      dlOptions.format = 'bestaudio';
      dlOptions.extractAudio = true;
      dlOptions.audioFormat = 'mp3';
    }

    await youtubedl(url, dlOptions);
    console.log('下載完成，檔案名稱:', outputFile);

    if (!fs.existsSync(outputFile)) {
      throw new Error('檔案未生成，可能下載失敗');
    }

    res.download(outputFile, `${videoTitle}.${format}`, (err) => {
      if (err) {
        console.log('傳送檔案失敗:', err);
        res.send('下載失敗，請稍後再試。錯誤：' + err.message);
      } else {
        console.log('檔案傳送成功');
        fs.unlinkSync(outputFile);
      }
    });
  } catch (error) {
    console.log('下載錯誤:', error);
    res.send('下載失敗：' + error.message);
  }
});

app.listen(port, () => {
  console.log(`伺服器運行在 http://localhost:${port}`);
});