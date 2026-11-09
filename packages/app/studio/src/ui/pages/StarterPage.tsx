import {createElement, PageContext, PageFactory, RouteLocation} from "@opendaw/lib-jsx"
import {StudioService} from "@/service/StudioService.ts"
import {Option, panic, RuntimeNotifier} from "@opendaw/lib-std"
import {Promises} from "@opendaw/lib-runtime"
import {ScriptHost} from "@opendaw/studio-scripting"
import scriptWorkerUrl from "@opendaw/studio-scripting/ScriptWorker.js?worker&url"
import {ProjectSkeleton} from "@opendaw/studio-adapters"
import {BoxGraph} from "@opendaw/lib-box"
import {BoxIO} from "@opendaw/studio-boxes"
import {Project} from "@opendaw/studio-core"

// Color & Noise: the first screen of the Sound environment is a project you
// can press play on, not an empty timeline. When the host finds no project
// to open it navigates here; this page builds the Starter through the same
// scripting surface as the code editor, opens it in the studio and moves on
// to /create. The Starter is an ordinary project: rename it, change it,
// throw it away.
//
// The script runs in the scripting worker with `openDAW` and `PPQN` as
// globals (see ScriptRunner), so it is plain JavaScript, not TypeScript.
const STARTER_SCRIPT = `
const project = openDAW.newProject("Starter")
project.bpm = 120
const synth = project.addInstrumentUnit("Vaporisateur", {label: "Pluck", volume: -9}, {
    cutoff: 2400, resonance: 0.4, filterEnvelope: 0.6, decay: 0.25, sustain: 0.1, release: 0.4
})
const region = synth.noteTracks[0].addRegion({duration: PPQN.Bar * 4, loopDuration: PPQN.Bar, label: "Pluck"})
const scale = [57, 60, 62, 64, 67, 69, 72, 76]
for (let step = 0; step < 16; step++) {
    const rise = step < 8 ? step : 15 - step
    region.addEvent({
        position: step * PPQN.SemiQuaver,
        duration: PPQN.SemiQuaver,
        pitch: scale[rise],
        velocity: step % 4 === 0 ? 1.0 : 0.7
    })
}
region.addEvent({position: 0, duration: PPQN.Bar, pitch: 45, velocity: 0.6})
project.openInStudio()
`

export const StarterPage: PageFactory<StudioService> = ({service}: PageContext<StudioService>) => {
    const host = new ScriptHost({
        openProject: async (buffer: ArrayBufferLike, name?: string): Promise<void> => {
            if (!await service.projectProfileService.approveLosingChanges()) {return}
            const boxGraph = new BoxGraph<BoxIO.TypeMap>(Option.wrap(BoxIO.create))
            boxGraph.fromArrayBuffer(buffer, false)
            const mandatoryBoxes = ProjectSkeleton.findMandatoryBoxes(boxGraph)
            const project = Project.fromSkeleton(service, {boxGraph, mandatoryBoxes})
            service.projectProfileService.setProject(project, name ?? "Starter")
        },
        // The Starter only creates and opens a project; nothing below is reached.
        applyUpdates: () => panic("Starter does not edit a project"),
        hasProject: async () => service.projectProfileService.getValue().nonEmpty(),
        showInfo: (headline: string, message: string) => RuntimeNotifier.info({headline, message}),
        fetchProject: () => panic("Starter does not read a project"),
        addSample: () => panic("Starter has no samples"),
        listSamples: async () => [],
        renderMixdown: () => panic("Starter does not render"),
        saveFile: () => panic("Starter does not save files")
    }, scriptWorkerUrl)
    return (
        <div onInit={async (_element: HTMLElement) => {
            const {status, error} = await Promises.tryCatch(host.executeScript(STARTER_SCRIPT, {
                sampleRate: service.audioContext.sampleRate,
                baseFrequency: 440.0
            }))
            if (status === "rejected") {
                console.warn(error)
                RuntimeNotifier.notify({message: "Could not open the Starter.", icon: "Warning"})
            }
            RouteLocation.get().navigateTo("/create")
        }}/>
    )
}
