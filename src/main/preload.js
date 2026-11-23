'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', {
  onScene: (cb) => ipcRenderer.on('scene', (_e, scene) => cb(scene)),
  setOverPet: (over) => ipcRenderer.send('over-pet', !!over),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragMove: () => ipcRenderer.send('drag-move'),
  dragEnd: () => ipcRenderer.send('drag-end'),
});
