const { app, Tray, Menu } = require('electron')
const path = require('path')
const loudness = require('loudness')

let tray = null
async function main() {
  const mutedIcon = path.join(__dirname, 'assets', 'mic-unmute-white.png')
  const unmutedIcon = path.join(__dirname, 'assets', 'mic-white.png')

  const isMuted = await loudness.getMuted()

  const changeMuteState = async () => {
    if (await loudness.getMuted()) {
      await loudness.setMuted(false)
      tray.setImage(unmutedIcon)
      tray.setToolTip('Mute')
    } else {
      await loudness.setMuted(true)
      tray.setImage(mutedIcon)
      tray.setToolTip('Unmute')
    }
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Quit', type: 'normal', click: () => app.quit() }
  ])

  tray = new Tray(isMuted ? mutedIcon : unmutedIcon)
  tray.setContextMenu(contextMenu)
  tray.setToolTip(isMuted ? 'Unmute' : 'Mute')
  tray.on('right-click', changeMuteState)
}

app.whenReady().then(() => main())
