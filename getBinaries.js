/* eslint-disable no-console */
const https = require('https');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');

let youtubedlLink;

const download = (url, dest) => {
  const file = fs.createWriteStream(dest);
  file.on('open', () => {
    https
      .get(url, (response) => {
        if ([301, 302, 303].indexOf(response.statusCode) > -1) {
          file.close();
          download(response.headers.location, dest);
        } else {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
          });
        }
      })
      .on('error', (err) => {
        fs.unlinkSync(dest);
        console.error(err);
      });
  });
};

console.log(process.platform);
switch (process.platform) {
  case 'win32':
    youtubedlLink = 'https://youtube-dl.org/downloads/latest/youtube-dl.exe';
    break;
  case 'linux':
    youtubedlLink = 'https://youtube-dl.org/downloads/latest/youtube-dl';
    break;
  case 'darwin':
    youtubedlLink = 'https://youtube-dl.org/downloads/latest/youtube-dl';
    break;
  default:
    return;
}

if (!fs.existsSync(`${__dirname}/bin/${youtubedlLink.split('/').pop()}`)) {
  download(youtubedlLink, `${__dirname}/bin/${youtubedlLink.split('/').pop()}`);
}
if (process.platform === 'win32') {
  fs.createReadStream(ffmpeg).pipe(
    fs.createWriteStream(`${__dirname}/bin/ffmpeg.exe`)
  );
} else {
  fs.createReadStream(ffmpeg).pipe(
    fs.createWriteStream(`${__dirname}/bin/ffmpeg`)
  );
}
