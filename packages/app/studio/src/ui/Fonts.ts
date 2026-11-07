import {FontFaceProperties} from "@opendaw/lib-dom"

export const Fonts = {
    Rubik: <FontFaceProperties>{
        "font-family": "Rubik",
        "font-weight": 300,
        "font-style": "normal",
        "src": `${import.meta.env.BASE_URL}fonts/rubik-300.woff2`
    },
    RubikBold: <FontFaceProperties>{
        "font-family": "Rubik",
        "font-weight": 400,
        "font-style": "normal",
        "src": `${import.meta.env.BASE_URL}fonts/rubik-400.woff2`
    },
    OpenSans: <FontFaceProperties>{
        "font-family": "Open Sans",
        "font-weight": "normal",
        "font-style": "normal",
        "src": `${import.meta.env.BASE_URL}fonts/OpenSans-Regular.ttf`
    }
}