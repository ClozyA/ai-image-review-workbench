import { app, shell, BrowserWindow, dialog, ipcMain, net, protocol } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createProjectSnapshotFromFolder, type ReviewProjectSnapshot } from './project-scanner'
import { ProjectRepository } from './project-repository'
import { importFullProjectBundle } from './project-importer'
import { importLocalBackupJson } from './project-backup-importer'
import {
  exportFullProjectBundle,
  exportReviewData,
  type ExportFormat,
  type ExportPayload
} from './export-service'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1600,
    minHeight: 1000,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const userDataDir = app.getPath('userData')
const projectRepository = new ProjectRepository(join(userDataDir, 'projects'))
const thumbnailBaseDir = join(userDataDir, 'thumbnails')

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  protocol.handle('local-image', (request) => {
    const filePath = decodeURIComponent(request.url.replace('local-image://', ''))
    return net.fetch(pathToFileURL(filePath).toString())
  })

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('project:open-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const snapshot = await createProjectSnapshotFromFolder(result.filePaths[0], thumbnailBaseDir)
    await projectRepository.saveSnapshot(snapshot)
    return snapshot
  })

  ipcMain.handle('project:list-snapshots', async () => {
    return projectRepository.listSnapshots()
  })

  ipcMain.handle('project:import-full-bundle', async () => {
    const snapshot = await importFullProjectBundle(thumbnailBaseDir)
    if (!snapshot) return null
    await projectRepository.saveSnapshot(snapshot)
    return snapshot
  })

  ipcMain.handle('project:import-local-backup', async () => {
    const snapshot = await importLocalBackupJson(thumbnailBaseDir)
    if (!snapshot) return null
    await projectRepository.saveSnapshot(snapshot)
    return snapshot
  })

  ipcMain.handle('project:save-snapshot', async (_, snapshot: ReviewProjectSnapshot) => {
    await projectRepository.saveSnapshot(snapshot)
    return true
  })

  ipcMain.handle('project:remove-snapshot', async (_, projectId: string) => {
    await projectRepository.removeSnapshot(projectId)
    return true
  })

  ipcMain.handle(
    'project:export-results',
    async (_, payload: ExportPayload, format: ExportFormat) => {
      return exportReviewData(payload, format)
    }
  )

  ipcMain.handle('project:export-full-bundle', async (_, snapshot: ReviewProjectSnapshot) => {
    return exportFullProjectBundle(snapshot)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
