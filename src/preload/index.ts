import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openProjectFolder: () => ipcRenderer.invoke('project:open-folder'),
  importLocalBackup: () => ipcRenderer.invoke('project:import-local-backup'),
  importFullProjectBundle: () => ipcRenderer.invoke('project:import-full-bundle'),
  listProjectSnapshots: () => ipcRenderer.invoke('project:list-snapshots'),
  saveProjectSnapshot: (snapshot) => ipcRenderer.invoke('project:save-snapshot', snapshot),
  removeProjectSnapshot: (projectId) => ipcRenderer.invoke('project:remove-snapshot', projectId),
  exportProjectResults: (payload, format) =>
    ipcRenderer.invoke('project:export-results', payload, format),
  exportFullProjectBundle: (snapshot) => ipcRenderer.invoke('project:export-full-bundle', snapshot)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
