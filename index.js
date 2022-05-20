const { app, Tray, Menu } = require('electron')
const path = require('path')
const { promisify } = require('util')
const exec = promisify(require('child_process').exec)

let tray = null

class Amixer {
  device

  constructor() {
    this.device = null
  }

  async setDefaultDevice() {
    return exec('cat /proc/asound/cards')
      .then(async ({ stdout, stderr }) => {
        if (stderr) app.quit()

        const devices = []
        stdout.split('\n').forEach((line) => {
          const deviceMatch = /[0-9] \[\w+/i.exec(line)
          if (deviceMatch) {
            devices.push({
              id: /[0-9]/.exec(deviceMatch)[0],
              name: /[a-zA-Z]+/i.exec(deviceMatch)[0]
            })
          }
        })
        for (const device of devices) {
          try {
            await exec(`amixer -c ${device.id} get ${device.name}`)
            this.device = device
            return device
          } catch {
            continue
          }
        }
        if (!this.device) app.quit()
      })
      .catch((error) => {
        app.quit()
      })
  }

  async isMuted() {
    return this.setDefaultDevice().then(async () => {
      const { stdout, stderr } = await exec(
        `amixer -c ${this.device.id} get ${this.device.name}`
      )

      if (stderr) {
        app.quit()
      }

      const { 2: muted } =
        /[a-z][a-z ]*: Capture [0-9-]+ \[([0-9]+)%\] (?:[[0-9.-]+dB\] )?\[(on|off)\]/i.exec(
          stdout
        )

      return muted === 'off'
    })
  }

  async setMuted(muted) {
    const action = muted ? 'cap' : 'nocap'
    const { stderr } = await exec(
      `amixer -c ${this.device.id} set ${this.device.name} ${action}`
    )
    if (stderr) {
      app.quit()
    }
  }
}

async function main() {
  const mutedIcon = path.join(__dirname, 'assets', 'mic-unmute-white.png')
  const unmutedIcon = path.join(__dirname, 'assets', 'mic-white.png')

  const amixer = new Amixer()
  const isMuted = await amixer.isMuted()

  const setContextMenu = (label) => {
    const contextMenu = Menu.buildFromTemplate([
      { label, type: 'normal', click: changeMuteState },
      { type: 'separator' },
      { label: 'Quit', type: 'normal', click: () => app.quit() }
    ])
    tray.setContextMenu(contextMenu)
  }

  const changeMuteState = async () => {
    if (await amixer.isMuted()) {
      await amixer.setMuted(true)
      tray.setImage(unmutedIcon)
      setContextMenu('Mute')
    } else {
      await amixer.setMuted(false)
      tray.setImage(mutedIcon)
      setContextMenu('Unmute')
    }
  }

  tray = new Tray(isMuted ? mutedIcon : unmutedIcon)
  setContextMenu(isMuted ? 'Unmute' : 'Mute')
}

app.whenReady().then(() => main())
