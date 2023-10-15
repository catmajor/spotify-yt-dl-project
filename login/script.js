class StripeManager {
  constructor(domElements, desktop) {
    this.sqrt3 = Math.sqrt(3)
    this.desktop = desktop
    this.domElements = domElements
    this.stripeArr = []
    this.adjustStripes()
  }
  adjustStripes() {
    this.stripeWidthAtBottom = 49 * this.sqrt3 + 49 / this.sqrt3
    this.stripeXShiftAtBottom = window.innerHeight / this.sqrt3
    while (window.innerWidth > this.stripeWidthAtBottom * this.stripeArr.length - this.stripeXShiftAtBottom) {
      let temp = new BackgroundStripe(this, this.stripeArr.length)
      this.stripeArr.push(temp)
    }
    this.stripeArr.forEach(stripe => stripe.changePosition())
  }
  animate(frame) {
    this.animateStripes(frame)
  }
  animateStripes(frame) {
    this.stripeArr.forEach(stripe => {
      stripe.animateFrame(frame)
    })
  }
}

class BackgroundStripe {
  constructor(parent, index) {
    this.parent = parent
    this.domElements = parent.domElements
    this.desktop = parent.desktop
    this.index = index
    this.dom = document.createElement("div")
    this.wrapper = document.createElement("div")
    this.dom.setAttribute("class", "background-stripe")
    this.wrapper.setAttribute("class", "background-stripe-wrapper")
    this.domElements.background.appendChild(this.wrapper)
    this.wrapper.appendChild(this.dom)
    this.randomPeriodOffset = Math.PI - 2 * Math.random() * Math.PI
    this.randomSpeedOffset = 0.5 + 0.5 * Math.random()
    this.changePosition()
  }
  animateFrame(frame) {
    let lowPercent = 20 * Math.sin(frame / 10 * this.randomSpeedOffset + this.randomPeriodOffset) + 10 
    let highPercent = lowPercent + 70
    this.dom.style.setProperty("--low-percent", `${lowPercent}%`)
    this.dom.style.setProperty("--high-percent", `${highPercent}%`)

  }
  changePosition() {
    this.wrapper.style.setProperty("--xpos", `${-this.parent.stripeXShiftAtBottom + this.index * this.parent.stripeWidthAtBottom}px`)
  }
}




function main() {
  const domElements = {
    background: document.querySelector("body>.background"),
    splash: document.querySelector("main>.splash")
  }
  let animationArray = []
  let frame = 0
  let stripes;
  loadElements()
  let resizing;
  window.addEventListener("resize", resize)

  async function login() {
    const timeOne = new Date()
    await new Promise((resolve, reject) => {
      window.addEventListener("tokensAquired", ()=>{
        resolve()
      })
      window.open("./login", "Spotify Login Window", `popup = true, height = 500, width = 500, top=${window.innerHeight/2-250}, left=${window.innerWidth/2-250}`)
    })
    console.log(window.token, window.refresh)
    localStorage.setItem("refresh", window.refresh)
    localStorage.setItem("token", window.token)
    const timeTwo = new Date()
    if ((timeTwo.getUTCSeconds() - timeOne.getUTCSeconds()) >= 1) {
      domElements.links.linkUI.textContent = "Open UI"
      domElements.links.linkUI.removeEventListener("mousedown", login)
      domElements.links.linkUI.addEventListener("mousedown", openUI)
    } else {
      openUI()
    }
  }
  async function openUI () {
    if (!(window.token||window.refresh)) {
      await login()
    }
    window.location = ("/p/ui")
  }
  async function checkTokenValidity(token) {
    const result = await fetch(`./check?token=${token}`)
    const response = await result.json()
    if (response) {
      console.log("Token Valid")
    } else {
      console.log("Token Invalid")
    }
    return response
  }
  async function loadElements() {
    domElements.links = await createLinks()
    createBackgroundStripes()
    createAnimationTimer()
    async function createLinks() {
      const linkUI = document.createElement("a")
      const tokenExists = localStorage.getItem("token")
      let validToken = false;
      if (tokenExists) {
        validToken = await checkTokenValidity(tokenExists)
      }
      if (!(tokenExists&&validToken)) {
        linkUI.addEventListener('mousedown', login)
        linkUI.innerText = "Login"
      }
      else {
        window.token = localStorage.getItem("token")
        window.refresh = localStorage.getItem("refresh")
        linkUI.addEventListener("mousedown", openUI)
        linkUI.innerText = "Open UI"
      }
      domElements.splash.appendChild(linkUI)
      return { linkUI }
    }
    function createBackgroundStripes() {
      stripes = new StripeManager(domElements, true)
      animationArray.push(stripes)
    }
    function createAnimationTimer() {
      return setInterval(() => {
        frame++
        animationArray.forEach(ele => ele.animate(frame))
      }, 50)
    }
  }
  function resize() {
    if (resizing) clearTimeout(resizing)
    resizing = setTimeout(resizeEnd, 100)
    function resizeEnd() {
      stripes.adjustStripes()
      resizing = false
    }
  }
}
window.token = null
main()