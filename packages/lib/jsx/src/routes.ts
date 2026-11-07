import {isDefined, Lazy, Notifier, Observer, Option, Subscription} from "@opendaw/lib-std"

// Color & Noise fork: let the SPA run under a sub-path (e.g. /sound/) when built with a Vite `base`.
// The base is read from the module entry script's URL, so no extra configuration is needed:
// "/sound/main.<hash>.js" -> "/sound"; a root deployment ("/main.<hash>.js") -> "".
const routeBase = (() => {
    let cached: Option<string> = Option.None
    return (): string => {
        if (cached.nonEmpty()) {return cached.unwrap()}
        const script = document.querySelector<HTMLScriptElement>("script[type=module][src]")
        const pathname = isDefined(script) ? new URL(script.src, location.href).pathname : "/"
        const base = pathname.slice(0, pathname.lastIndexOf("/")).replace(/\/$/, "")
        cached = Option.wrap(base)
        return base
    }
})()
const stripBase = (pathname: string): string => {
    const base = routeBase()
    if (base.length === 0 || !pathname.startsWith(base)) {return pathname}
    const rest = pathname.slice(base.length)
    return rest.length === 0 ? "/" : rest
}
const withBase = (path: string): string => path.startsWith("/") ? routeBase() + path : path

export class RouteLocation {
    @Lazy
    static get(): RouteLocation {return new RouteLocation()}

    readonly #notifier: Notifier<RouteLocation> = new Notifier<RouteLocation>()

    private constructor() {
        window.addEventListener("popstate", () => this.#notifier.notify(this))
        this.#setCanonical()
    }

    // Pushes a new history entry, so the browser's back button returns to the previous path.
    navigateTo(path: string): boolean {
        if (this.path === path) {
            return false
        }
        history.pushState(null, "", withBase(path))
        this.#setCanonical()
        this.#notifier.notify(this)
        return true
    }

    // Replaces the current history entry, so the previous path cannot be reached with the back button
    // (for redirects and consumed deep links that must not be revisited).
    replaceWith(path: string): boolean {
        if (this.path === path) {
            return false
        }
        history.replaceState(null, "", withBase(path))
        this.#setCanonical()
        this.#notifier.notify(this)
        return true
    }

    catchupAndSubscribe(observer: Observer<RouteLocation>): Subscription {
        observer(this)
        return this.#notifier.subscribe(observer)
    }

    get path(): string {return stripBase(location.pathname)}

    #setCanonical(): void {
        const url = location.href
        let link = document.querySelector("link[rel=\"canonical\"]")
        if (isDefined(link)) {
            link.setAttribute("href", url)
        } else {
            link = document.createElement("link")
            link.setAttribute("rel", "canonical")
            link.setAttribute("href", url)
            document.head.appendChild(link)
        }
    }
}

export type Route = { path: string }

export class RouteMatcher<R extends Route> {
    static create<R extends Route>(routes: ReadonlyArray<R>): RouteMatcher<R> {
        return new RouteMatcher<R>(routes)
    }

    static match(route: string, path: string): boolean {
        if (!path.startsWith("/") || !route.startsWith("/")) {
            return false
        }
        if (path.length > 1 && path.endsWith("/")) {
            path = path.slice(0, -1)
        }
        const routeSegments = route.split("/")
        const pathSegments = path.split("/")
        for (let i = 1; i < pathSegments.length; i++) {
            if (routeSegments[i] === "*") {
                return true
            }
            if (pathSegments[i] !== routeSegments[i]) {
                return false
            }
        }
        return true
    }

    readonly #routes: ReadonlyArray<R>

    private constructor(routes: ReadonlyArray<R>) {
        this.#routes = routes.toSorted((a: Route, b: Route) => {
            if (a.path < b.path) {
                return -1
            }
            if (a.path > b.path) {
                return 1
            }
            return 0
        })
    }

    resolve(path: string): Option<R> {
        return Option.wrap(this.#routes.find(route => RouteMatcher.match(route.path, path)))
    }
}