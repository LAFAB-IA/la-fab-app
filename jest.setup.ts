import "@testing-library/jest-dom"

// jsdom ne fournit pas requestAnimationFrame — shim synchrone pour que les
// useEffect qui l'utilisent (ex: Toast slide-in) ne lèvent pas d'erreur
global.requestAnimationFrame = (cb) => {
    cb(0)
    return 0
}
global.cancelAnimationFrame = () => {}
