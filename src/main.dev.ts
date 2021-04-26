/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./src/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import Store from 'electron-store';
import MenuBuilder from './menu';
import YoutubeDL from './youtubedl';
import { DownloadAction, UpdateState } from './types';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const getAppRoot = () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    return path.join(app.getAppPath(), '/../');
  }
  if (process.platform === 'win32') {
    return path.join(app.getAppPath(), '/../../');
  }
  return path.join(app.getAppPath(), '/../../../');
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'resources')
    : path.join(__dirname, '../assets');

  const getAssetPath = (...paths: string[]): string =>
    path.join(RESOURCES_PATH, ...paths);

  mainWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 450,
    icon: getAssetPath('icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setMenuBarVisibility(false);

      console.log('APP PATH:', getAppRoot());
      const youtubedl = new YoutubeDL(
        `${getAppRoot()}/bin/youtube-dl`,
        `${getAppRoot()}/bin/`
      );
      const prefStore = new Store();

      const checkForUpdates = () => {
        mainWindow?.webContents.send(
          'update-state-updated',
          UpdateState.Checking
        );
        mainWindow?.webContents.send('youtube-dl-ready', false);
        youtubedl.update(
          () => {
            mainWindow?.webContents.send(
              'update-state-updated',
              UpdateState.Updating
            );
          },
          () => {
            mainWindow?.webContents.send(
              'update-state-updated',
              UpdateState.Success
            );
            mainWindow?.webContents.send('youtube-dl-ready', true);
            prefStore.set('last-update', Date.now());
            youtubedl.getVersion((v) => {
              prefStore.set('version', v);
              mainWindow?.webContents.send('version-updated', v);
              mainWindow?.webContents.send('youtube-dl-ready', true);
            });
          }
        );
      };
      setTimeout(() => console.log(youtubedl), 3000);
      // Listen for events
      // On url change
      ipcMain.on('url-changed', (_, arg) => {
        console.log('got url-changed', arg);
        youtubedl.getAvailableFormats(arg, (formats) =>
          mainWindow?.webContents.send('quality-list-updated', formats)
        );
      });
      // On download action triggered
      ipcMain.on('do-download', (_, arg) => {
        const data = arg as DownloadAction;
        youtubedl.download(
          data.link,
          data.directoryPath,
          data.quality,
          (p) => {
            let msg = p.filter((s) => s.startsWith('ERROR:'))[0];
            if (typeof msg !== 'string') {
              msg = '';
            }
            mainWindow?.webContents.send('download-error', msg);
          },
          (p) => {
            mainWindow?.webContents.send('progress-updated', {
              show: true,
              progress: p,
            });
          },
          (stdout) => {
            if (stdout.pop()?.includes('has already been downloaded')) {
              mainWindow?.webContents.send(
                'download-error',
                'file-already-exists'
              );
            } else {
              mainWindow?.webContents.send('download-success');
            }
          }
        );
      });
      // On update check request
      ipcMain.on('update-check', () => {
        console.log('received update-check');
        checkForUpdates();
      });
      ipcMain.on('cancel-download', () => {
        youtubedl.terminate();
      });

      // Check for update if last check was over a day ago
      console.log('date stuff:', Date.now(), prefStore.get('last-update', 0));
      if (Date.now() - (prefStore.get('last-update', 0) as number) > 86400000) {
        checkForUpdates();
      } else {
        // Else just emit the current version
        mainWindow?.webContents.send('youtube-dl-ready', true);
        mainWindow?.webContents.send(
          'update-state-updated',
          UpdateState.Success
        );
        if (prefStore.get('version', '') === '') {
          youtubedl.getVersion((v) => {
            prefStore.set('version', v);
            mainWindow?.webContents.send('version-updated', v);
          });
        } else {
          mainWindow?.webContents.send(
            'version-updated',
            prefStore.get('version', '')
          );
        }
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(createWindow).catch(console.log);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});

// ipcMain.on('test', (event, arg) => {
//   console.log(Date.now(), 'I am inside main process, arg=', arg);
//   // event.reply('test2', 'hello from main');
//   console.log(aaa());
// });
