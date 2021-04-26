/* eslint-disable no-console */
import { ChildProcess, spawn } from 'child_process';

const YoutubeDL = class {
  youtubedlPath: string;

  ffmpegPath: string;

  process: ChildProcess | undefined;

  progress = 0;

  constructor(youtubedlPath: string, ffmpegPath: string) {
    try {
      spawn(youtubedlPath);
      spawn(`${ffmpegPath}/ffmpeg`);
      this.youtubedlPath = youtubedlPath;
      this.ffmpegPath = ffmpegPath;
    } catch (err) {
      throw new Error('Error executing youtubedl or ffmpeg');
    }
  }

  /**
   * Executes youtube dl with passed arguments
   * @param {string[]} args arguments to pass to youtube-dl
   * @param {(line: string) => void} [onStdout] callback for stdout of youtube-dl
   * @param {(output: string[], exitCode: number) => void} [onFinish] callback for execution finish of youtube-dl
   */
  execute = (
    args: string[] | undefined,
    onStdout?: (line: string) => void,
    onFinish?: (output: string[], exitCode: number) => void
  ) => {
    try {
      const child = spawn(this.youtubedlPath, args);
      console.log(args);
      this.progress = 0;
      const scriptOutput: string[] = [];
      this.process = child;
      child.stdout.setEncoding('utf-8');
      child.stderr.setEncoding('utf-8');
      child.stdout.on('data', (data) => {
        const stringData: string = data.toString();
        scriptOutput.push(stringData);
        if (onStdout !== undefined) {
          onStdout(stringData);
          console.log('\x1b[31myoutube-dl\x1b[0m:', stringData);
        }
      });
      child.stderr.on('data', (data) => {
        const stringData: string = data.toString();
        scriptOutput.push(stringData);
      });
      child.on('close', (code: number) => {
        if (onFinish !== undefined) {
          onFinish(scriptOutput, code);
        }
      });
    } catch (err) {
      throw new Error('Error executing youtubedl or ffmpeg');
    }
  };

  getVersion = (onComplete: (output: string) => void): void => {
    this.execute(['--version'], undefined, (output, code) => {
      if (code === 0) {
        onComplete(output[0]);
      } else {
        onComplete(output[0]);
      }
    });
  };

  update = (onUpdate: () => void, onFinish: () => void): void => {
    this.execute(
      ['-U'],
      (data) => {
        if (data.toString().includes('Updating')) onUpdate();
      },
      () => onFinish()
    );
  };

  terminate = () => {
    if (this.process !== undefined) {
      this.process.kill();
    }
  };

  download = (
    link: string,
    savePath: string,
    quality = '(bestvideo+bestaudio/best)',
    onError?: (output: string[]) => void,
    progress?: (progress: number) => void,
    onFinish?: (output: string[]) => void
  ) => {
    this.execute(
      [
        '--output',
        `${savePath}/%(id)s.%(ext)s`,
        '-f',
        quality,
        link,
        '--ffmpeg-location',
        this.ffmpegPath,
      ],
      (data) => {
        if (progress !== undefined) {
          const tmp = /\[download\] *(\d{1,3}.\d)/gm.exec(data.toString());
          if (tmp !== null && tmp.length > 1) {
            const currentProgress = parseInt(tmp[1], 10);
            if (currentProgress > this.progress) {
              this.progress = currentProgress;
              progress(this.progress);
            }
          }
        }
      },
      (data, code) => {
        if (code === 0) {
          if (onFinish !== undefined) onFinish(data);
        } else if (onError !== undefined) onError(data);
      }
    );
  };

  getAvailableFormats = (
    link: string,
    onFinish: (list: string[][]) => void
  ) => {
    this.execute(['-F', link], undefined, (data) => {
      const match = [...data.toString().matchAll(/^((\d{1,3}).*)/gm)];
      console.log(data);
      onFinish(match);
    });
  };
};

export default YoutubeDL;
