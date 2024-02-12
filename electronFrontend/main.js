const { app, BrowserWindow, ipcMain, dialog } = require('electron');


function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  win.loadFile('index.html');
}

ipcMain.on('open-folder-dialog', (event) => {
    dialog.showOpenDialog({
      properties: ['openDirectory']
    }).then(result => {
      if (!result.canceled) {
        event.reply('selected-folder', result.filePaths[0]);
      }
    }).catch(err => {
      console.log(err);
    });
  });

ipcMain.on('confirm-rebuild', (event) => {
const options = {
    type: 'question',
    buttons: ['Yes', 'No'],
    defaultId: 1,
    title: 'Confirm Rebuild',
    message: 'This action will delete all participants in the database, and re-generate the QR codes. It will erase all progress for gifts that have been given already. Are you sure you want to continue?'
};

dialog.showMessageBox(null, options).then(result => {
    event.reply('confirm-rebuild-reply', result.response === 0); // 'Yes' is 0
});
});

app.whenReady().then(createWindow);
