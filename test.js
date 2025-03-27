const youtubedl = require('youtube-dl-exec');

async function testDownload() {
  try {
    const output = await youtubedl('https://www.youtube.com/watch?v=_HJeJ9apzRA', {
      output: 'testvideo', // 指定基本名稱
      format: 'bestvideo+bestaudio',
      mergeOutputFormat: 'mp4', // 強制輸出 MP4
      verbose: true, // 顯示詳細日誌
    });
    console.log('下載完成，檔案名稱:', output);
  } catch (error) {
    console.log('下載錯誤:', error);
  }
}

testDownload();